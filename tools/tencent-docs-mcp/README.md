# 腾讯文档 MCP Server

让 Claude 生成完 Word/Excel/PPT 之后，**直接把文件推进腾讯文档并返回可打开的链接**，
省掉「下载到本地 → 打开腾讯文档 → 手动导入」这几步。

底层用的是[腾讯文档开放平台 OpenAPI](https://docs.qq.com/open/document/app/) 的异步导入接口，
支持 `doc(x)` / `xls(x)` / `ppt(x)` / `pdf` / `txt` / `csv`。

## 1. 拿凭证

登录 <https://docs.qq.com/open/>，完成开发者资质认证（**个人可以认证，不需要公司主体**）。
认证通过后，首页「开发者信息」里会直接给出三个值：

| 名称 | 说明 |
| --- | --- |
| `client_id` | 应用 ID，不是机密 |
| `access_token` | **有效期 30 天**，过期后回后台点「重置」再复制 |
| `open_id` | 你的开放平台用户标识 |

这三个值正好就是调用 OpenAPI 需要的三个 HTTP header（`Client-Id` / `Access-Token` / `Open-Id`），
所以**个人自用场景不需要创建应用，也不需要走 OAuth2 授权码流程**。

> 个人开发者后台不提供 `client_secret`，因此没法用 `/oauth/v2/app-account-token`
> 程序化续期，token 过期只能手动重置。一年 12 次。

调用配额（开放平台限时优惠，以后台公示为准）：普通用户 2000 次/天，
超级会员 20000 次/天，超级会员 Plus 40000 次/天。一次导入约消耗 4 次调用。

## 2. 安装

```bash
cd tools/tencent-docs-mcp
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
```

## 3. 先用 CLI 验证接口通不通

建议接进 Claude 之前先在命令行跑一遍，这样出问题能看到原始报错：

```bash
export TENCENT_DOCS_CLIENT_ID=...
export TENCENT_DOCS_ACCESS_TOKEN=...
export TENCENT_DOCS_OPEN_ID=...

python -m tencent_docs_mcp.cli check              # 验证凭证
python -m tencent_docs_mcp.cli list               # 列出根目录
python -m tencent_docs_mcp.cli import ~/报告.docx  # 导入并打印链接
```

## 4. 接进 Claude Code

```bash
claude mcp add tencent-docs \
  --env TENCENT_DOCS_CLIENT_ID=... \
  --env TENCENT_DOCS_ACCESS_TOKEN=... \
  --env TENCENT_DOCS_OPEN_ID=... \
  -- /绝对路径/tools/tencent-docs-mcp/.venv/bin/python -m tencent_docs_mcp.server
```

之后就可以直接说「把这份周报生成 Word 并放到我的腾讯文档里」。

## 提供的工具

| 工具 | 作用 |
| --- | --- |
| `import_file_to_tencent_docs` | 导入本地文件，返回 `url` |
| `list_tencent_docs` | 列出文件和文件夹 |
| `create_tencent_docs_folder` | 新建文件夹 |
| `get_tencent_doc_permission` | 查询分享权限 |
| `set_tencent_doc_permission` | 修改分享权限 |
| `check_tencent_docs_auth` | 检查凭证是否有效 |

## 导入链路

导入不是一次调用，而是四步（`client.py` 里已经封装成 `import_file()`）：

```
① POST /openapi/drive/v2/files/upload-url      → COSPutURL, COSFileKey
② PUT  <COSPutURL>                              ← 文件二进制直传 COS
③ POST /openapi/drive/v2/files/async-import     → progressQueryID
④ GET  /openapi/drive/v2/files/import-progress  → 轮询到 data.ID
最终链接：https://docs.qq.com/{doc|sheet|slide|pdf}/{ID}
```

## 测试

`tests/` 用 `httpx.MockTransport` 打桩，覆盖完整导入链路、鉴权 header、token 过期、
业务错误、导入超时等，不会打到真实接口：

```bash
pip install -e ".[dev]"
pytest
```

## 已知不确定的地方

这些是从开放平台文档和社区封装库 [easy-wx/qq-doc](https://github.com/easy-wx/qq-doc)
还原出来的，**尚未对着线上接口实测过**，跑不通时优先怀疑这几处：

- `set_tencent_doc_permission` 的 `policy` 取值枚举未确认，代码里是原样透传。
- 导入结果里的链接：优先用接口返回的 `URL` 字段，没有才按扩展名拼
  `/doc/` `/sheet/` `/slide/` `/pdf/`，其中 pdf 的路径前缀不确定。
- 部分资料提到导入类接口可能需要在后台单独申请开通。如果 ①③ 步返回权限错误，
  去开放平台后台或反馈入口确认一下接口权限。

改动集中在 `client.py`，接口有变只需要改那一个文件。
