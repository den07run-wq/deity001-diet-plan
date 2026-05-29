const MealRecord = require('../models/MealRecord');
const pool = require('../config/db');

// ---------- 纯文本模型配置 ----------
const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

// ---------- 视觉模型配置（用于图片识别） ----------
const AI_VISION_API_KEY = process.env.AI_VISION_API_KEY || AI_API_KEY;
const AI_VISION_API_URL = process.env.AI_VISION_API_URL || AI_API_URL;
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || 'qwen-vl-max';

const SYSTEM_PROMPT = `你是一个专业的饮食营养分析助手。用户会用中文描述他们吃了什么，或提供食物图片。

请根据用户提供的文本描述或图片内容，精确识别其中包含的食物。必须以严格的JSON数组格式返回识别结果。

每个食物对象包含：
- foodName: 食物名称（中文，尽量精确到常见叫法）
- weight: 估算的克数（数字类型，不是字符串）

关键规则：
1. 只返回JSON数组，不得包含任何Markdown语法、代码块标记或解释文字
2. 如果用户提供了图片，必须仔细观察图片中实际出现的食物来识别，不要编造
3. 如果用户提供了文本描述，根据文本描述来识别
4. 如果同时提供了图片和文本，以图片内容为主，文本作为辅助参考
5. 如果无法识别图片或文本中的食物，返回空数组 []
6. 绝对不要返回示例或模板中的默认食物，只返回用户实际提供的内容`;

const DIET_PLAN_PROMPT = `你是一位资深营养师和膳食规划专家。你需要根据用户的个人数据、热量目标和口味偏好，为其制定一份科学合理的一周饮食计划。

## 输出格式要求
你必须严格按照以下 JSON 格式输出，不得包含任何 Markdown 标记、代码块或解释文字：

{
  "summary": "总体营养建议（50字以内）",
  "dailyCalorieTarget": 1800,
  "days": {
    "周一": {
      "breakfast": [
        { "foodName": "食物名称", "calories": 350, "reason": "简短理由" }
      ],
      "lunch": [
        { "foodName": "食物名称", "calories": 550, "reason": "简短理由" }
      ],
      "dinner": [
        { "foodName": "食物名称", "calories": 450, "reason": "简短理由" }
      ]
    }
  }
}

## 营养规划规则
1. 每天总热量应接近 dailyCalorieTarget（误差 ±100kcal），三餐热量配比建议 3:4:3 或 3:5:2
2. 蛋白质占 20-30%、脂肪占 20-30%、碳水占 40-55%
3. 每天食材不重复，7 天至少覆盖 30 种以上不同食材
4. 每周至少 3 天包含鱼类或海鲜，保证 Omega-3 摄入
5. 优先使用中式家常菜作为菜名（如：番茄炒蛋、清蒸鲈鱼）
6. 每餐包含 1-3 种食物，详细到具体菜名而非笼统分类
7. reason 字段需简要说明营养搭配逻辑（10字以内）

## 重要
- 所有 7 天（周一至周日）都必须输出
- 只输出纯 JSON 对象，不要有任何前缀或后缀文字`;

const aiController = {
  async analyze(req, res) {
    try {
      const { text, imageBase64, mealType, recordDate } = req.body;

      if (!mealType || !recordDate) {
        return res.status(400).json({ code: 400, message: '请提供用餐时段和记录日期', data: null });
      }

      if (!['早餐', '午餐', '晚餐', '加餐'].includes(mealType)) {
        return res.status(400).json({ code: 400, message: '无效的餐次类型', data: null });
      }

      if (!text && !imageBase64) {
        return res.status(400).json({ code: 400, message: '请提供饮食描述文本或食物图片', data: null });
      }

      const isVision = !!imageBase64;

      if (isVision && (!AI_VISION_API_KEY || AI_VISION_API_KEY === 'your_api_key_here')) {
        console.error('[AI] 视觉模型 API Key 未配置');
        return res.status(500).json({
          code: 500,
          message: '食物图片识别需要视觉模型支持，请在 backend/.env 中配置 AI_VISION_API_KEY 和 AI_VISION_MODEL',
          data: null,
        });
      }

      if (!isVision && (!AI_API_KEY || AI_API_KEY === 'your_api_key_here')) {
        console.error('[AI] 文本模型 API Key 未配置');
        return res.status(500).json({
          code: 500,
          message: 'AI服务未配置，请在 backend/.env 中设置 AI_API_KEY',
          data: null,
        });
      }

      // 构建用户消息
      let userMessage = '';
      if (text && imageBase64) {
        userMessage = `用户描述：${text}\n请结合文本描述和图片内容分析食物。`;
      } else if (text) {
        userMessage = `用户描述：${text}\n请分析食物内容。`;
      } else {
        userMessage = '请仔细观察图片中出现的所有食物，逐一识别并估算每种食物的克数。';
      }

      const model = isVision ? AI_VISION_MODEL : AI_MODEL;
      const apiUrl = isVision ? AI_VISION_API_URL : AI_API_URL;
      console.log('[AI] 开始调用大模型...', {
        model,
        apiUrl,
        mealType,
        recordDate,
        isVision,
        hasText: !!text,
        hasImage: !!imageBase64,
      });

      let aiResult;
      try {
        aiResult = await callAI(SYSTEM_PROMPT, userMessage, imageBase64);
      } catch (err) {
        console.error('[AI] 调用大模型 API 失败:', err.message);
        return res.status(502).json({ code: 502, message: 'AI服务调用失败，请稍后重试', data: null });
      }

      console.log('[AI] ========== 大模型原始返回 ==========');
      console.log(aiResult);
      console.log('[AI] ========== 原始返回结束 ==========');

      const foodItems = parseAIResponse(aiResult);
      if (!foodItems || foodItems.length === 0) {
        console.log('[AI] 解析结果为空或无法识别，原始返回:', aiResult.substring(0, 300));
        return res.status(200).json({
          code: 200,
          message: 'AI未能识别出食物，请提供更详细的描述或更清晰的图片',
          data: { items: [], matched: 0 },
        });
      }

      console.log('[AI] 解析到食物:', foodItems.map((f) => `${f.foodName}(${f.weight}g)`).join(', '));

      // 逐个匹配食材库，防空处理
      const matchedRecords = [];
      for (const item of foodItems) {
        if (!item || !item.foodName || !item.weight) {
          console.warn('[AI] 跳过无效条目:', JSON.stringify(item));
          continue;
        }
        try {
          const foodId = await fuzzyMatchFood(item.foodName);
          if (foodId != null) {
            matchedRecords.push({
              food_id: foodId,
              food_name: item.foodName,
              weight: item.weight,
            });
            console.log(`[AI] 匹配成功: "${item.foodName}" -> food_id=${foodId}`);
          } else {
            console.warn(`[AI] 未匹配到食材: "${item.foodName}"`);
          }
        } catch (matchErr) {
          console.error(`[AI] 匹配 "${item.foodName}" 时数据库查询失败:`, matchErr.message);
        }
      }

      if (matchedRecords.length === 0) {
        return res.status(200).json({
          code: 200,
          message: 'AI已识别但未在食材库中找到匹配，请手动添加',
          data: { items: foodItems, matched: 0 },
        });
      }

      const insertRows = matchedRecords.map((r) => ({
        user_id: req.userId,
        plan_id: null,
        food_id: r.food_id,
        record_date: recordDate,
        meal_type: mealType,
        quantity: r.weight,
        note: `AI自动录入: ${r.food_name}`,
      }));

      await MealRecord.batchCreate(insertRows);

      const names = matchedRecords.map((r) => r.food_name).join('、');
      console.log(`[AI] 录入成功: ${names}，共 ${matchedRecords.length} 项`);
      return res.status(201).json({
        code: 201,
        message: `AI 已成功识别并录入：${names}`,
        data: { items: matchedRecords, matched: matchedRecords.length },
      });
    } catch (err) {
      console.error('[AI] 未预期的服务器错误:', err.stack || err.message);
      res.status(500).json({ code: 500, message: '服务器内部错误: ' + err.message, data: null });
    }
  },

  async generateDietPlan(req, res) {
    try {
      const { calorieTarget, preferences } = req.body;

      const calTarget = parseInt(calorieTarget) || 2000;
      if (calTarget < 800 || calTarget > 5000) {
        return res.status(400).json({ code: 400, message: '热量目标应在 800-5000 kcal 之间', data: null });
      }

      const [users] = await pool.query(
        'SELECT gender, age, height, weight, goal FROM users WHERE id = ?',
        [req.userId]
      );
      const profile = users[0] || {};

      const userInfo = [
        profile.gender ? `性别：${profile.gender}` : '',
        profile.age ? `年龄：${profile.age}岁` : '',
        profile.height ? `身高：${profile.height}cm` : '',
        profile.weight ? `体重：${profile.weight}kg` : '',
        profile.goal ? `健康目标：${profile.goal}` : '',
      ].filter(Boolean).join('，');

      const userMessage = [
        `用户信息：${userInfo || '未填写详细信息'}`,
        `每日热量目标：${calTarget} kcal`,
        preferences ? `口味偏好/忌口：${preferences}` : '',
        '请根据以上信息生成一周饮食计划。',
      ].filter(Boolean).join('\n');

      console.log('[AI] 开始生成饮食计划...', { userId: req.userId, calTarget, hasPref: !!preferences });

      let aiResult;
      try {
        aiResult = await callAI(DIET_PLAN_PROMPT, userMessage, null, 4000);
      } catch (err) {
        console.error('[AI] 生成饮食计划失败:', err.message);
        return res.status(502).json({ code: 502, message: 'AI服务调用失败，请稍后重试', data: null });
      }

      console.log('[AI] 饮食计划原始返回:', aiResult.substring(0, 500));

      const plan = parseJSONObject(aiResult);
      if (!plan || !plan.days) {
        console.error('[AI] 饮食计划解析失败，原始:', aiResult.substring(0, 300));
        return res.status(200).json({
          code: 200,
          message: 'AI 返回格式异常，请重试',
          data: null,
        });
      }

      res.status(200).json({
        code: 200,
        message: 'AI 饮食计划生成成功',
        data: plan,
      });
    } catch (err) {
      console.error('[AI] 饮食计划生成异常:', err.stack || err.message);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  },
};

// ---------- 工具函数 ----------

/**
 * 通用大模型调用函数
 * - 有 imageBase64 时：使用视觉模型 + 多模态消息格式（支持 Base64 数据 URL）
 * - 无 imageBase64 时：使用纯文本模型 + 普通消息格式
 */
async function callAI(systemPrompt, userMessage, imageBase64 = null, maxTokens = 1000) {
  const isVision = !!imageBase64;
  const model = isVision ? AI_VISION_MODEL : AI_MODEL;
  const apiKey = isVision ? AI_VISION_API_KEY : AI_API_KEY;
  const apiUrl = isVision ? AI_VISION_API_URL : AI_API_URL;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (isVision) {
    // 多模态格式：content 为数组，包含文本和图片（Base64 数据 URL 或普通 URL 均可）
    const contentParts = [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ];
    console.log("--- 检查我发出去的请求长啥样 ---", JSON.stringify(messages, null, 2));
    messages.push({ role: 'user', content: contentParts });
  } else {
    // 纯文本格式
    messages.push({ role: 'user', content: userMessage });
  }

  const requestBody = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: maxTokens,
  };

  console.log('[AI] 请求模型:', model, '| API:', apiUrl, '| isVision:', isVision);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000),
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
      throw new Error('AI API 请求超时 (60s)');
    }
    throw new Error(`AI API 网络请求失败: ${fetchErr.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '无法读取响应体');
    console.error(`[AI] API 返回错误 ${response.status}:`, errText.substring(0, 500));
    throw new Error(`AI API 返回 ${response.status}: ${errText.substring(0, 200)}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw new Error('AI API 返回非 JSON 格式: ' + parseErr.message);
  }

  // 打印完整响应结构（方便调试）
  console.log('[AI] API 完整响应:', JSON.stringify(data).substring(0, 500));

  const content = data?.choices?.[0]?.message?.content;
  if (content == null) {
    console.error('[AI] API 响应结构异常:', JSON.stringify(data).substring(0, 500));
    throw new Error('AI API 响应中未找到 choices[0].message.content');
  }

  return content;
}

/**
 * 从大模型返回的文本中提取 JSON 数组
 * 处理以下情况：
 *   1. 纯 JSON 数组文本
 *   2. ```json ... ``` 代码块包裹
 *   3. ``` ... ``` 无语言标记的代码块（含不配对的情况）
 *   4. 前后带有解释文字的 JSON 数组
 *   5. 只有开头的 ```json 没有结尾 ```
 */
function parseAIResponse(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return [];

  let cleaned = text.trim();

  // 步骤1: 尝试移除完整的 Markdown 代码块
  const fullBlock = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fullBlock) {
    cleaned = fullBlock[1].trim();
  } else {
    // 步骤2: 处理只有开头 ``` 没有结尾 ``` 的情况
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
  }

  // 步骤3: 尝试直接解析
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return normalizeItems(parsed);
    return [];
  } catch (e) {
    // 继续尝试
  }

  // 步骤4: 从文本中提取 JSON 数组部分（处理前后有说明文字的情况）
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return normalizeItems(parsed);
    } catch (e2) {
      console.error('[AI] JSON 数组提取后仍解析失败:', arrMatch[0].substring(0, 200));
    }
  }

  console.error('[AI] 最终解析失败，原始文本:', text.substring(0, 300));
  return [];
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.foodName && typeof item.weight === 'number' && item.weight > 0)
    .map((item) => ({
      foodName: String(item.foodName).trim(),
      weight: Math.round(Number(item.weight)),
    }));
}

/**
 * 四级模糊匹配食材库：
 *   1. 精确匹配 name = foodName
 *   2. foodName 包含在 name 中 (LIKE '%foodName%')
 *   3. name 包含在 foodName 中 (foodName LIKE '%name%')
 *   4. foodName 前2字匹配 (LIKE '%前2字%')
 *
 * 返回 food_id (number) 或 null
 */
async function fuzzyMatchFood(foodName) {
  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    return null;
  }

  const name = foodName.trim();
  const pool = require('../config/db');

  // 1. 精确匹配
  try {
    const [exact] = await pool.query('SELECT id FROM food_items WHERE name = ?', [name]);
    if (exact && exact.length > 0 && exact[0] && exact[0].id != null) {
      return exact[0].id;
    }
  } catch (err) {
    throw new Error(`数据库精确匹配查询失败: ${err.message}`);
  }

  // 2. 模糊匹配：名称包含关键词
  try {
    const [like] = await pool.query('SELECT id FROM food_items WHERE name LIKE ? LIMIT 1', [`%${name}%`]);
    if (like && like.length > 0 && like[0] && like[0].id != null) {
      return like[0].id;
    }
  } catch (err) {
    throw new Error(`数据库模糊匹配查询失败: ${err.message}`);
  }

  // 3. 反向模糊：关键词包含在名称中
  try {
    const [reverse] = await pool.query(
      'SELECT id FROM food_items WHERE ? LIKE CONCAT("%", name, "%") LIMIT 1',
      [name],
    );
    if (reverse && reverse.length > 0 && reverse[0] && reverse[0].id != null) {
      return reverse[0].id;
    }
  } catch (err) {
    throw new Error(`数据库反向匹配查询失败: ${err.message}`);
  }

  // 4. 拆词匹配：前2字
  if (name.length >= 2) {
    try {
      const shortName = name.substring(0, 2);
      const [short] = await pool.query('SELECT id FROM food_items WHERE name LIKE ? LIMIT 1', [
        `%${shortName}%`,
      ]);
      if (short && short.length > 0 && short[0] && short[0].id != null) {
        return short[0].id;
      }
    } catch (err) {
      throw new Error(`数据库拆词匹配查询失败: ${err.message}`);
    }
  }

  return null;
}

function parseJSONObject(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return null;

  let cleaned = text.trim();

  const fullBlock = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fullBlock) {
    cleaned = fullBlock[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) { /* fall through */ }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (e2) {
      console.error('[AI] JSON 对象解析失败:', objMatch[0].substring(0, 200));
    }
  }

  return null;
}

module.exports = { ...aiController, callAI };
