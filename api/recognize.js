// Vercel Serverless Function
// 部署后可通过 POST /api/recognize 调用
// 需要在 Vercel 项目 Settings → Environment Variables 里设置 ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `你是一个帮用户把手写单词笔记转成结构化数据的助手。
用户会给你一张手写笔记的照片，笔记内容通常是背单词记录，可能包含：日期、词根/词缀分组、单词、词性、中文释义、单词拆解方式、例句或搭配、以及掌握程度的标记（比如打勾、画圈、三角、叉号等各种自定义符号）。

请仔细辨认图片中的手写内容，把每一个单词整理成一条记录，最终只输出一个 JSON 数组，不要输出任何其他文字、解释或 Markdown 代码块标记。

每条记录的字段：
- date: 日期，格式如 "7/22"，图片上没有就留空字符串
- root: 这个词所属的词根/词缀分组标签（如果笔记明确把几个词归在同一个词根下，把词根原文抄进来，比如 "tail·tom = cut（切）"；如果这个词没有和其他词共享词根，留空字符串）
- mastery: 掌握程度，只能是三个值之一：""（没有标记或看起来已掌握）、"△"（表示印象模糊/不确定，如果原文是打问号、画圈等类似含义的符号也归为这一类）、"✗"（表示需要重点复习/标记错误，如果原文是打叉、画重点符号等类似含义也归为这一类）
- word: 单词本身（英文）
- pos: 词性缩写，如 "n." "v." "adj." 等，看不出来就留空
- meaning: 中文释义
- breakdown: 单词拆解方式，如果笔记里写了词根词缀的拆解就抄进来，没有就留空
- example: 例句或搭配，没有就留空

注意：
- 如果某个字迹辨认不确定，按你最合理的判断填写，不要因为不确定就跳过整条记录
- 只输出 JSON 数组本身，形如 [{"date":"7/22","root":"...","mastery":"","word":"...","pos":"...","meaning":"...","breakdown":"...","example":"..."}, ...]
- 如果图片里完全没有可辨认的单词笔记内容，输出空数组 []`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '服务器未配置 ANTHROPIC_API_KEY，请在 Vercel 项目环境变量里设置后重新部署' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: '请求体不是合法 JSON' });
    return;
  }

  const { imageBase64, mediaType } = body || {};
  if (!imageBase64 || !mediaType) {
    res.status(400).json({ error: '缺少 imageBase64 或 mediaType' });
    return;
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: '请识别这张手写单词笔记，按要求输出 JSON 数组。' },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(anthropicRes.status).json({ error: `Claude API 调用失败：${errText}` });
      return;
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    const rawText = textBlock ? textBlock.text : '[]';

    // 容错：去掉可能出现的 ```json 代码块包裹
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let entries;
    try {
      entries = JSON.parse(cleaned);
    } catch (e) {
      res.status(502).json({ error: '识别结果不是合法 JSON，原始返回：' + rawText.slice(0, 500) });
      return;
    }

    if (!Array.isArray(entries)) {
      res.status(502).json({ error: '识别结果不是数组' });
      return;
    }

    res.status(200).json({ entries });
  } catch (err) {
    res.status(500).json({ error: '服务器出错：' + err.message });
  }
}
