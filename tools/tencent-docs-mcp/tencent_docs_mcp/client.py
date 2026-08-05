"""腾讯文档开放平台 OpenAPI 客户端。

只覆盖「把本地文件导入腾讯文档」这条链路需要的接口，外加少量文件夹/权限操作。

鉴权用的是个人开发者后台（https://docs.qq.com/open/）首页「开发者信息」里
直接给出的三个值，不需要走 OAuth2 授权码流程：

    Access-Token / Client-Id / Open-Id

接口路径与参数名来自开放平台文档及社区封装库 easy-wx/qq-doc，如果腾讯改了
接口，改这一个文件即可。
"""

from __future__ import annotations

import hashlib
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

BASE_URL = "https://docs.qq.com"
API_URL = f"{BASE_URL}/openapi/drive/v2"

# 导入接口支持的格式 -> 上传到 COS 时用的 Content-Type
EXT_CONTENT_TYPE = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".csv": "text/csv",
}

# 导入后文档在腾讯文档里的品类，用于拼最终链接
EXT_DOC_KIND = {
    ".doc": "doc",
    ".docx": "doc",
    ".txt": "doc",
    ".xls": "sheet",
    ".xlsx": "sheet",
    ".csv": "sheet",
    ".ppt": "slide",
    ".pptx": "slide",
    ".pdf": "pdf",
}


class TencentDocsError(RuntimeError):
    """接口返回了业务错误。"""

    def __init__(self, message: str, *, ret: int | None = None, payload: Any = None):
        super().__init__(message)
        self.ret = ret
        self.payload = payload


class AuthError(TencentDocsError):
    """凭证无效，或 access_token 已过期。"""


@dataclass(frozen=True)
class Credentials:
    client_id: str
    access_token: str
    open_id: str

    @classmethod
    def from_env(cls) -> "Credentials":
        values = {
            "TENCENT_DOCS_CLIENT_ID": os.environ.get("TENCENT_DOCS_CLIENT_ID", "").strip(),
            "TENCENT_DOCS_ACCESS_TOKEN": os.environ.get("TENCENT_DOCS_ACCESS_TOKEN", "").strip(),
            "TENCENT_DOCS_OPEN_ID": os.environ.get("TENCENT_DOCS_OPEN_ID", "").strip(),
        }
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise AuthError(
                "缺少环境变量：" + "、".join(missing) + "。\n"
                "这三个值在 https://docs.qq.com/open/ 首页「开发者信息」里，点「复制」即可。"
            )
        return cls(
            client_id=values["TENCENT_DOCS_CLIENT_ID"],
            access_token=values["TENCENT_DOCS_ACCESS_TOKEN"],
            open_id=values["TENCENT_DOCS_OPEN_ID"],
        )


def file_md5(path: Path) -> str:
    digest = hashlib.md5()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def doc_url(file_id: str, suffix: str) -> str:
    kind = EXT_DOC_KIND.get(suffix.lower(), "doc")
    return f"{BASE_URL}/{kind}/{file_id}"


class TencentDocsClient:
    def __init__(self, credentials: Credentials | None = None, *, timeout: float = 60.0):
        self.credentials = credentials or Credentials.from_env()
        self._http = httpx.Client(timeout=timeout, follow_redirects=True)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "TencentDocsClient":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    # ---------- 底层请求 ----------

    def _headers(self, **extra: str) -> dict[str, str]:
        headers = {
            "Access-Token": self.credentials.access_token,
            "Client-Id": self.credentials.client_id,
            "Open-Id": self.credentials.open_id,
            "Accept": "application/json",
        }
        headers.update(extra)
        return headers

    def _call(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
        json_body: Any = None,
        raise_on_ret: bool = True,
    ) -> dict[str, Any]:
        headers = self._headers()
        if data is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"

        response = self._http.request(
            method,
            f"{API_URL}{path}",
            params=params,
            data=data,
            json=json_body,
            headers=headers,
        )

        if response.status_code in (401, 403):
            raise AuthError(
                f"鉴权失败（HTTP {response.status_code}）。access_token 很可能已过期——"
                "去 https://docs.qq.com/open/ 首页点 access_token 那行的「重置」，"
                "复制新值更新 TENCENT_DOCS_ACCESS_TOKEN 后重启 MCP server。"
            )
        if response.status_code >= 400:
            raise TencentDocsError(
                f"{method} {path} 返回 HTTP {response.status_code}：{response.text[:500]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise TencentDocsError(f"{method} {path} 返回的不是 JSON：{response.text[:500]}") from exc

        ret = payload.get("ret")
        if raise_on_ret and ret not in (0, None):
            raise TencentDocsError(
                f"{method} {path} 业务失败 ret={ret} msg={payload.get('msg')!r}",
                ret=ret,
                payload=payload,
            )
        return payload

    # ---------- 导入 ----------

    def _create_upload_url(self, md5: str, name: str, size: int) -> dict[str, Any]:
        payload = self._call(
            "POST",
            "/files/upload-url",
            data={"fileMD5": md5, "fileName": name, "fileSize": size},
        )
        return payload.get("data") or {}

    def _put_to_cos(self, path: Path, put_url: str, content_type: str) -> None:
        with path.open("rb") as handle:
            response = self._http.put(
                put_url,
                content=handle,
                headers={"Content-Type": content_type},
            )
        if response.status_code >= 300:
            raise TencentDocsError(
                f"上传到 COS 失败（HTTP {response.status_code}）：{response.text[:500]}"
            )

    def _async_import(
        self,
        md5: str,
        name: str,
        cos_file_key: str,
        parent_folder_id: str | None,
        file_password: str | None,
    ) -> str:
        data: dict[str, Any] = {"fileMD5": md5, "fileName": name, "COSFileKey": cos_file_key}
        if parent_folder_id:
            data["parentfolderID"] = parent_folder_id
        if file_password:
            data["filePassword"] = file_password

        payload = self._call("POST", "/files/async-import", data=data)
        query_id = (payload.get("data") or {}).get("progressQueryID")
        if not query_id:
            raise TencentDocsError("async-import 没有返回 progressQueryID", payload=payload)
        return query_id

    def _wait_for_import(self, query_id: str, *, timeout: float = 180.0) -> dict[str, Any]:
        """轮询导入进度。

        进行中时接口可能返回非 0 的 ret，或者 ret=0 但 data.ID 还没生成，
        两种都当作「还在转换」继续等；真正的鉴权错误会立刻抛出。
        """
        deadline = time.monotonic() + timeout
        interval = 1.0
        last: dict[str, Any] = {}

        while time.monotonic() < deadline:
            payload = self._call(
                "GET",
                "/files/import-progress",
                params={"progressQueryID": query_id},
                raise_on_ret=False,
            )
            last = payload
            data = payload.get("data") or {}
            if payload.get("ret") in (0, None) and data.get("ID"):
                return data
            time.sleep(interval)
            interval = min(interval * 1.5, 3.0)

        raise TencentDocsError(
            f"导入超时（{timeout:.0f}s 内没等到结果），最后一次响应：{last}",
            payload=last,
        )

    def import_file(
        self,
        file_path: str | Path,
        *,
        title: str | None = None,
        parent_folder_id: str | None = None,
        file_password: str | None = None,
        timeout: float = 180.0,
    ) -> dict[str, Any]:
        """把本地文件导入腾讯文档，返回含 url / id 的结果。"""
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"文件不存在：{path}")

        suffix = path.suffix.lower()
        content_type = EXT_CONTENT_TYPE.get(suffix)
        if content_type is None:
            raise ValueError(
                f"腾讯文档导入接口不支持 {suffix or '无扩展名'} 格式，"
                f"支持的是：{'、'.join(sorted(EXT_CONTENT_TYPE))}"
            )

        name = path.name
        if title:
            name = title if Path(title).suffix.lower() == suffix else f"{title}{suffix}"

        md5 = file_md5(path)
        size = path.stat().st_size

        upload = self._create_upload_url(md5, name, size)
        put_url = upload.get("COSPutURL")
        cos_file_key = upload.get("COSFileKey")
        if not put_url or not cos_file_key:
            raise TencentDocsError(f"upload-url 返回缺少 COSPutURL/COSFileKey：{upload}")

        self._put_to_cos(path, put_url, content_type)
        query_id = self._async_import(md5, name, cos_file_key, parent_folder_id, file_password)
        data = self._wait_for_import(query_id, timeout=timeout)

        file_id = data.get("ID")
        url = data.get("URL") or data.get("url") or doc_url(file_id, suffix)
        return {
            "id": file_id,
            "url": url,
            "title": data.get("title") or name,
            "source_file": str(path),
            "raw": data,
        }

    # ---------- 文件夹 ----------

    def list_files(
        self,
        folder_id: str | None = None,
        *,
        start: int = 0,
        limit: int = 20,
        sort_type: str = "browse",
        asc: int = 0,
    ) -> list[dict[str, Any]]:
        path = f"/folders/{folder_id}" if folder_id else "/folders"
        payload = self._call(
            "GET",
            path,
            params={"sortType": sort_type, "asc": asc, "start": start, "limit": limit},
        )
        return (payload.get("data") or {}).get("list") or []

    def create_folder(self, title: str, parent_folder_id: str | None = None) -> dict[str, Any]:
        data: dict[str, Any] = {"title": title}
        if parent_folder_id:
            data["parentfolderID"] = parent_folder_id
        payload = self._call("POST", "/folders", data=data)
        return payload.get("data") or {}

    # ---------- 权限 ----------

    def get_permission(self, file_id: str) -> dict[str, Any]:
        payload = self._call("GET", f"/files/{file_id}/permission")
        return payload.get("data") or payload

    def set_permission(
        self,
        file_id: str,
        *,
        policy: str | None = None,
        copy_enabled: bool = True,
        reader_comment_enabled: bool = True,
    ) -> dict[str, Any]:
        """设置分享权限。

        policy 的取值由腾讯文档定义，这里原样透传，具体枚举以开放平台文档为准。
        """
        data: dict[str, Any] = {
            "copyEnabled": copy_enabled,
            "readerCommentEnabled": reader_comment_enabled,
        }
        if policy:
            data["policy"] = policy
        payload = self._call("PATCH", f"/files/{file_id}/permission", data=data)
        return payload.get("data") or payload
