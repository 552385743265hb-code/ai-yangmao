-- 审核建议（仅管理员可见）：{"verdict":"approve|history|reject|judge","code":"理由代码","reason":"一句话","by":"谁给的","at":"时间"}
ALTER TABLE offers ADD COLUMN review_suggestion text;
