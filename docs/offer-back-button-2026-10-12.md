# 羊毛详情返回按钮修复

2026-10-12。原链接href=javascript:history.back()，被现有script-src self的CSP阻止执行，导致用户点击无反应。

公共详情模板改成正常站内hash链接，记录进入详情前的来源页面；直接访问详情默认返回today。保留安全策略，全部详情共用修复，不执行javascript URL。

代码949abc1已推送并上线，生产版本3760d824-71cb-4223-839e-c039cc9bbe38，tag=949abc1。干净提交typecheck、984项Vitest、11项审核CLI及前端构建通过。

实际浏览器验证：从全部羊毛点击模力方舟详情，返回href=#all，点击后URL及标题回到全部羊毛；新建标签直接访问同一详情，返回href=#today，点击后URL及标题回到今天。截图：[详情返回按钮](evidence/offer-back-button-2026-10-12.jpg)。
