/**
 * 数据导入脚本
 * 将扩展的植物数据和动态题库导入到抖音云数据库
 * 
 * 使用方法：
 * 1. 在抖音云控制台的"云函数"中创建新函数
 * 2. 将此脚本内容复制到云函数中
 * 3. 执行函数完成数据导入
 */

const { dySDK } = require('@open-dy/node-server-sdk');

// 扩展的植物数据（基于 enhanced_plants.json）
const plantsData = [
  {
    "id": "p106",
    "name": "芦荟",
    "tags": ["high", "small", "beginner", "succulent", "medicinal"],
    "onShelf": true,
    "cover": "https://example-cdn/aloe.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p107", 
    "name": "玉树",
    "tags": ["high", "medium", "beginner", "succulent", "good-luck"],
    "onShelf": true,
    "cover": "https://example-cdn/jade.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p108",
    "name": "龟背竹", 
    "tags": ["medium", "large", "intermediate", "dramatic", "pet_toxic"],
    "onShelf": true,
    "cover": "https://example-cdn/monstera.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p109",
    "name": "雪铁芋",
    "tags": ["low", "medium", "beginner", "office-friendly", "pet_toxic"],
    "onShelf": true,
    "cover": "https://example-cdn/zz-plant.jpg", 
    "updatedAt": Date.now()
  },
  {
    "id": "p110",
    "name": "吊兰",
    "tags": ["medium", "small", "beginner", "pet-safe", "air-purifying"],
    "onShelf": true,
    "cover": "https://example-cdn/spider-plant.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p111",
    "name": "一叶兰",
    "tags": ["low", "medium", "beginner", "pet-safe", "cast-iron-tough"],
    "onShelf": true,
    "cover": "https://example-cdn/cast-iron-plant.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p112",
    "name": "白鹤芋",
    "tags": ["low", "medium", "intermediate", "flowering", "pet_toxic"],
    "onShelf": true,
    "cover": "https://example-cdn/peace-lily.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p113",
    "name": "袖珍椰子",
    "tags": ["low", "medium", "intermediate", "pet-safe", "tropical"],
    "onShelf": true,
    "cover": "https://example-cdn/parlor-palm.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p114",
    "name": "波士顿蕨",
    "tags": ["low", "medium", "intermediate", "pet-safe", "humidity-loving"],
    "onShelf": true,
    "cover": "https://example-cdn/boston-fern.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p115",
    "name": "散尾葵",
    "tags": ["high", "large", "intermediate", "pet-safe", "air-purifying"],
    "onShelf": true,
    "cover": "https://example-cdn/areca-palm.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p116",
    "name": "宝石花",
    "tags": ["high", "small", "beginner", "pet-safe", "succulent"],
    "onShelf": true,
    "cover": "https://example-cdn/echeveria.jpg",
    "updatedAt": Date.now()
  },
  {
    "id": "p117",
    "name": "铜钱草",
    "tags": ["medium", "small", "beginner", "pet-safe", "good-luck"],
    "onShelf": true,
    "cover": "https://example-cdn/pilea.jpg",
    "updatedAt": Date.now()
  }
];

// 动态题库配置
const dynamicQuestionConfig = {
  "type": "dynamic_questionnaire",
  "version": "v2.1",
  "updatedAt": Date.now(),
  "questionBank": {
    "userProfile": {
      "name": "用户画像调查类",
      "priority": 1,
      "description": "收集用户基本信息，建立用户画像",
      "triggerConditions": ["all"],
      "questions": [
        {
          "id": "livingStatus",
          "type": "single",
          "title": "您的居住状况？",
          "description": "帮助我们了解您的生活环境",
          "options": [
            { "value": "single", "label": "独居", "tags": ["space-flexible", "time-flexible"] },
            { "value": "couple", "label": "情侣/夫妻", "tags": ["aesthetic-important", "shared-care"] },
            { "value": "family", "label": "三口之家", "tags": ["safety-priority", "child-safe-needed"] },
            { "value": "elderly", "label": "老年人", "tags": ["low-maintenance", "health-benefit"] }
          ]
        },
        {
          "id": "experienceLevel",
          "type": "single", 
          "title": "您的植物养护经验？",
          "description": "帮助推荐适合您技能水平的植物",
          "options": [
            { "value": "beginner", "label": "完全新手", "tags": ["care-simple", "guidance-needed"] },
            { "value": "novice", "label": "初学者", "tags": ["care-easy", "forgiving-plants"] },
            { "value": "intermediate", "label": "有经验", "tags": ["care-moderate", "variety-seeking"] },
            { "value": "expert", "label": "资深玩家", "tags": ["care-advanced", "challenge-seeking"] }
          ]
        },
        {
          "id": "hasPets",
          "type": "single",
          "title": "家中是否养宠物？",
          "description": "确保植物对宠物安全",
          "options": [
            { "value": "cats", "label": "有猫", "tags": ["safety-critical", "cat-safe-only"] },
            { "value": "dogs", "label": "有狗", "tags": ["safety-critical", "dog-safe-only"] },
            { "value": "both", "label": "猫狗都有", "tags": ["safety-critical", "pet-safe-only"] },
            { "value": "none", "label": "没有宠物", "tags": ["safety-normal", "full-selection"] }
          ]
        }
      ]
    },
    "environment": {
      "name": "环境评估类",
      "priority": 2,
      "description": "评估您的居住环境条件",
      "triggerConditions": ["all"],
      "questions": [
        {
          "id": "lightCondition",
          "type": "single",
          "title": "您家主要摆放区域的光照条件？",
          "description": "可参考：南向窗=强光，东西向=中光，北向/室内=弱光",
          "options": [
            { "value": "low", "label": "弱光（北向窗/室内深处）", "plantTags": ["shade-tolerant", "low-light"] },
            { "value": "medium", "label": "中等光照（东西向窗）", "plantTags": ["partial-sun", "adaptable"] },
            { "value": "high", "label": "强光（南向窗/阳台）", "plantTags": ["full-sun", "sun-loving"] }
          ]
        },
        {
          "id": "spaceType",
          "type": "single",
          "title": "您打算在哪个位置摆放植物？",
          "description": "不同位置适合不同类型的植物",
          "options": [
            { "value": "windowsill", "label": "窗台", "plantTags": ["compact", "small"] },
            { "value": "desk", "label": "办公桌/书桌", "plantTags": ["desktop", "air-purifying"] },
            { "value": "floor", "label": "地面角落", "plantTags": ["floor-standing", "large"] },
            { "value": "hanging", "label": "悬挂空间", "plantTags": ["trailing", "hanging-basket"] }
          ]
        }
      ]
    }
  }
};

// 云函数主函数
exports.main = async (event, context) => {
  try {
    const svc = dySDK.getService();
    const db = svc.database();
    
    console.log('开始导入植物数据...');
    
    // 导入植物数据
    for (const plant of plantsData) {
      try {
        await db.collection('plants').add(plant);
        console.log(`成功导入植物: ${plant.name} (${plant.id})`);
      } catch (error) {
        console.error(`导入植物失败: ${plant.name}`, error);
      }
    }
    
    console.log('开始导入动态题库配置...');
    
    // 导入动态题库配置
    try {
      await db.collection('question_config').add(dynamicQuestionConfig);
      console.log('成功导入动态题库配置');
    } catch (error) {
      console.error('导入动态题库配置失败:', error);
    }
    
    // 查询验证
    const plantsCount = await db.collection('plants').count();
    const configCount = await db.collection('question_config').count();
    
    return {
      success: true,
      message: '数据导入完成',
      plantsTotal: plantsCount.total,
      configTotal: configCount.total
    };
    
  } catch (error) {
    console.error('数据导入失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
