# 页眉最近一次抓取口径修复

2026-10-11任务。管理员要求页眉改为最近一次抓取，部分成功也计入，只有全失败不更新。

原meta仅查询collect且ok=true；该flag要求所有信源处理成功、抽取/核验等无降级，因而误把最新有成功抓取的批次隐藏。读取当次生产台账：全量00:29 UTC为241成功/2失败，快速03:32 UTC为7成功，均因后续处理降级而ok=false。

新增readCollectionStatus，meta/coverage提供lastCollectedAt并保留lastSuccessfulCollect的完整成功含义。最近完成collect或sweep存在成功抓取即计入；新fetchedSources独立记录实际抓到内容的信源，源后续处理失败不会抹去抓取成功；旧台账兼容stats.ok/ok。model等任务不冒充抓取，全失败批次不更新抓取时间；coverageDegraded仍反映最新完成批次的缺口。

页眉及侧栏改用新时间，页眉显示“最近一次抓取”，不只改字样。缓存添加独立partial-fetch-v1版本以避免旧meta继续显示93小时。

## 上线验证（2026-10-12）

代码42cc6a7及浏览器缓存修复4695350均推送main。干净提交构建通过typecheck、983项Vitest、11项审核CLI及前端构建；生产版本76c9f7f9-ae64-4aaf-9969-3d776e051253，tag=4695350。

线上meta返回lastCollectedAt=2026-10-12T03:32:19.951Z（纽约10月11日23:32），lastSuccessfulCollect仍为10月8日完全成功批次，coverageDegraded=true。真实浏览器页眉显示“最近一次抓取”及23:32，并提示部分抓取或核验未完成，已摆脱原94小时前的歧义。

客户端meta/coverage请求加schema=partial-fetch-v1；仅变更服务端边缘缓存键不足以失效浏览器已有响应，本次两端一并版本化。截图：[新页眉](evidence/collection-freshness-header-2026-10-12.jpg)。未改写生产采集历史。
