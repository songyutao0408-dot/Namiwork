"""腾讯文档 MCP Server。

让 Claude 生成完 docx/xlsx/pptx 之后，直接把文件推进腾讯文档并返回可打开的链接，
省掉「下载到本地 -> 手动导入腾讯文档」这两步。

启动：
    TENCENT_DOCS_CLIENT_ID=... TENCENT_DOCS_ACCESS_TOKEN=... TENCENT_DOCS_OPEN_ID=... \
        python -m tencent_docs_mcp.server
"""

from __future__ import annotations

from typing import Any

try:  # mcp >= 2.0
    from mcp.server import MCPServer as _Server
except ImportError:  # mcp 1.x 里叫 FastMCP
    from mcp.server.fastmcp import FastMCP as _Server

from .client import Credentials, TencentDocsClient, TencentDocsError

mcp = _Server("tencent-docs")


def _client() -> TencentDocsClient:
    return TencentDocsClient()


@mcp.tool()
def import_file_to_tencent_docs(
    file_path: str,
    title: str | None = None,
    folder_id: str | None = None,
) -> dict[str, Any]:
    """把本地文件导入腾讯文档，返回可直接打开的链接。

    支持 doc/docx、xls/xlsx、ppt/pptx、pdf、txt、csv。生成 Word 文档后调这个工具，
    用户就能直接点链接在腾讯文档里打开和编辑，不需要先下载再手动导入。

    Args:
        file_path: 本地文件的绝对路径。
        title: 可选，导入后在腾讯文档里显示的标题，默认用文件名。
        folder_id: 可选，目标文件夹 ID，默认放在根目录。
    """
    with _client() as client:
        return client.import_file(file_path, title=title, parent_folder_id=folder_id)


@mcp.tool()
def list_tencent_docs(folder_id: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    """列出腾讯文档里的文件和文件夹。

    Args:
        folder_id: 可选，要列出的文件夹 ID，不传则列根目录。
        limit: 返回条数上限，默认 20。
    """
    with _client() as client:
        return client.list_files(folder_id, limit=limit)


@mcp.tool()
def create_tencent_docs_folder(title: str, parent_folder_id: str | None = None) -> dict[str, Any]:
    """在腾讯文档里新建文件夹。

    Args:
        title: 文件夹名称。
        parent_folder_id: 可选，父文件夹 ID，不传则建在根目录。
    """
    with _client() as client:
        return client.create_folder(title, parent_folder_id)


@mcp.tool()
def get_tencent_doc_permission(file_id: str) -> dict[str, Any]:
    """查询某个腾讯文档的分享权限设置。

    Args:
        file_id: 文档 ID（导入结果里的 id 字段）。
    """
    with _client() as client:
        return client.get_permission(file_id)


@mcp.tool()
def set_tencent_doc_permission(
    file_id: str,
    policy: str | None = None,
    copy_enabled: bool = True,
    reader_comment_enabled: bool = True,
) -> dict[str, Any]:
    """修改某个腾讯文档的分享权限。

    Args:
        file_id: 文档 ID。
        policy: 分享策略，取值由腾讯文档开放平台定义，原样透传。
        copy_enabled: 是否允许访问者复制内容。
        reader_comment_enabled: 是否允许只读访问者评论。
    """
    with _client() as client:
        return client.set_permission(
            file_id,
            policy=policy,
            copy_enabled=copy_enabled,
            reader_comment_enabled=reader_comment_enabled,
        )


@mcp.tool()
def check_tencent_docs_auth() -> dict[str, Any]:
    """检查腾讯文档凭证是否有效。

    凭证失效时会说明怎么去后台重置 access_token。access_token 有效期 30 天，
    个人开发者没有 client_secret，过期后需要手动重置。
    """
    try:
        credentials = Credentials.from_env()
    except TencentDocsError as exc:
        return {"ok": False, "reason": str(exc)}

    try:
        with TencentDocsClient(credentials) as client:
            client.list_files(limit=1)
    except TencentDocsError as exc:
        return {"ok": False, "reason": str(exc)}

    return {
        "ok": True,
        "client_id": credentials.client_id,
        "open_id": credentials.open_id[:6] + "…",
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
