# 页眉最近一次抓取口径修复

2026-10-11任务。管理员要求页眉改为最近一次抓取，部分成功也计入，只有全失败不更新。

原meta仅查询collect且ok=true；该flag要求所有信源处理成功、抽取/核验等无降级，因而误把最新有成功抓取的批次隐藏。读取当次生产台账：全量00:29 UTC为241成功/2失败，快速03:32 UTC为7成功，均因后续处理降级而ok=false。

新增readCollectionStatus，meta/coverage提供lastCollectedAt并保留lastSuccessfulCollect的完整成功含义。最近完成collect或sweep存在成功抓取即计入；新fetchedSources独立记录实际抓到内容的信源，源后续处理失败不会抹去抓取成功；旧台账兼容stats.ok/ok。model等任务不冒充抓取，全失败批次不更新抓取时间；coverageDegraded仍反映最新完成批次的缺口。

页眉及侧栏改用新时间，页眉显示“最近一次抓取”，不只改字样。缓存添加独立partial-fetch-v1版本以避免旧meta继续显示93小时。
