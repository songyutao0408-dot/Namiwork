"""用 httpx.MockTransport 跑一遍导入链路，不碰真实接口。

    pip install -e ".[dev]" && pytest
"""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from tencent_docs_mcp.client import (
    AuthError,
    Credentials,
    TencentDocsClient,
    TencentDocsError,
)

CREDS = Credentials(client_id="cid", access_token="tok", open_id="oid")


def build_client(handler) -> TencentDocsClient:
    client = TencentDocsClient(CREDS)
    client._http.close()
    client._http = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    return client


@pytest.fixture
def happy_path():
    """模拟 upload-url -> COS PUT -> async-import -> 轮询两次后拿到 ID。"""
    seen: dict[str, object] = {"polls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/files/upload-url"):
            seen["headers"] = dict(request.headers)
            seen["upload_body"] = request.content.decode()
            return httpx.Response(
                200,
                json={
                    "ret": 0,
                    "data": {"COSPutURL": "https://cos.example/put", "COSFileKey": "key123"},
                },
            )
        if url == "https://cos.example/put":
            seen["cos_body"] = request.content
            seen["cos_content_type"] = request.headers["content-type"]
            return httpx.Response(200, text="")
        if url.endswith("/files/async-import"):
            seen["import_body"] = request.content.decode()
            return httpx.Response(200, json={"ret": 0, "data": {"progressQueryID": "pq1"}})
        if "/files/import-progress" in url:
            seen["polls"] = int(seen["polls"]) + 1
            if int(seen["polls"]) < 3:
                return httpx.Response(200, json={"ret": 0, "data": {}})
            return httpx.Response(
                200, json={"ret": 0, "data": {"ID": "ABCdef123", "title": "季度报告.docx"}}
            )
        if "/folders" in url:
            return httpx.Response(200, json={"ret": 0, "data": {"list": [{"ID": "f1"}]}})
        raise AssertionError(f"unexpected request: {request.method} {url}")

    return handler, seen


def test_import_docx_returns_url(tmp_path: Path, happy_path):
    handler, seen = happy_path
    docx = tmp_path / "报告.docx"
    docx.write_bytes(b"PK\x03\x04 fake docx")

    with build_client(handler) as client:
        result = client.import_file(docx, title="季度报告")

    assert result["id"] == "ABCdef123"
    assert result["url"] == "https://docs.qq.com/doc/ABCdef123"
    assert seen["cos_body"] == b"PK\x03\x04 fake docx"
    assert seen["cos_content_type"].endswith("wordprocessingml.document")
    # data.ID 还没生成时要继续轮询，而不是当成失败
    assert seen["polls"] == 3


def test_import_sends_auth_headers(tmp_path: Path, happy_path):
    handler, seen = happy_path
    docx = tmp_path / "a.docx"
    docx.write_bytes(b"x")

    with build_client(handler) as client:
        client.import_file(docx)

    headers = seen["headers"]
    assert headers["access-token"] == "tok"
    assert headers["client-id"] == "cid"
    assert headers["open-id"] == "oid"


def test_title_override_keeps_extension(tmp_path: Path, happy_path):
    handler, seen = happy_path
    docx = tmp_path / "untitled.docx"
    docx.write_bytes(b"x")

    with build_client(handler) as client:
        client.import_file(docx, title="季度报告")

    # form-urlencoded 后是 UTF-8 percent-encoding，扩展名要被保留
    assert "%E5%AD%A3%E5%BA%A6%E6%8A%A5%E5%91%8A.docx" in seen["import_body"]


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("a.docx", "https://docs.qq.com/doc/ABCdef123"),
        ("a.xlsx", "https://docs.qq.com/sheet/ABCdef123"),
        ("a.pptx", "https://docs.qq.com/slide/ABCdef123"),
    ],
)
def test_url_prefix_follows_file_kind(tmp_path: Path, happy_path, name: str, expected: str):
    handler, _ = happy_path
    path = tmp_path / name
    path.write_bytes(b"x")

    with build_client(handler) as client:
        result = client.import_file(path)

    assert result["url"] == expected


def test_unsupported_extension_rejected_before_upload(tmp_path: Path, happy_path):
    handler, _ = happy_path
    md = tmp_path / "note.md"
    md.write_text("hi")

    with build_client(handler) as client, pytest.raises(ValueError, match=r"\.md"):
        client.import_file(md)


def test_expired_token_raises_auth_error(tmp_path: Path):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"ret": -1, "msg": "token expired"})

    docx = tmp_path / "a.docx"
    docx.write_bytes(b"x")

    with build_client(handler) as client, pytest.raises(AuthError, match="重置"):
        client.import_file(docx)


def test_business_error_surfaces_ret_and_msg(tmp_path: Path):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"ret": 10001, "msg": "no permission"})

    docx = tmp_path / "a.docx"
    docx.write_bytes(b"x")

    with build_client(handler) as client, pytest.raises(TencentDocsError) as excinfo:
        client.import_file(docx)

    assert excinfo.value.ret == 10001
    assert "no permission" in str(excinfo.value)


def test_import_timeout_reports_last_response(tmp_path: Path):
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/files/upload-url"):
            return httpx.Response(
                200,
                json={"ret": 0, "data": {"COSPutURL": "https://cos.example/put", "COSFileKey": "k"}},
            )
        if url == "https://cos.example/put":
            return httpx.Response(200, text="")
        if url.endswith("/files/async-import"):
            return httpx.Response(200, json={"ret": 0, "data": {"progressQueryID": "pq"}})
        # 永远转换不完
        return httpx.Response(200, json={"ret": 0, "data": {}})

    docx = tmp_path / "a.docx"
    docx.write_bytes(b"x")

    with build_client(handler) as client, pytest.raises(TencentDocsError, match="导入超时"):
        client.import_file(docx, timeout=2.0)


def test_missing_env_names_the_variables(monkeypatch):
    for key in ("TENCENT_DOCS_CLIENT_ID", "TENCENT_DOCS_ACCESS_TOKEN", "TENCENT_DOCS_OPEN_ID"):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(AuthError, match="TENCENT_DOCS_CLIENT_ID"):
        Credentials.from_env()
