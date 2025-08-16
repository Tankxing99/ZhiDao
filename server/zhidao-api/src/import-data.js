/**
 * 数据导入接口
 * 用于将植物数据和题库配置导入到抖音云数据库
 */

const fs = require('fs');
const path = require('path');

// 植物数据导入函数
async function importPlantsToDatabase(dySDK) {
  try {
    console.log('🌱 开始导入植物数据...');
    
    // 读取植物数据
    const plantsPath = path.join(__dirname, '../data/enhanced_plants.json');
    const plantsData = JSON.parse(fs.readFileSync(plantsPath, 'utf8'));
    
    const db = dySDK.database();
    const plantsCollection = db.collection('plants');
    
    // 清空现有数据（可选）
    console.log('🗑️  清理现有植物数据...');
    try {
      const existingPlants = await plantsCollection.where({}).get();
      console.log(`发现 ${existingPlants.data.length} 个现有植物记录`);
    } catch (error) {
      console.log('集合可能不存在，将创建新集合');
    }
    
    // 导入新数据
    let successCount = 0;
    let errorCount = 0;
    
    for (const plant of plantsData) {
      try {
        // 转换数据格式
        const plantDoc = {
          id: plant.id,
          name: plant.name,
          scientific_name: plant.scientific_name,
          common_names: plant.common_names,
          characteristics: plant.characteristics,
          environment: plant.environment,
          care: plant.care,
          toxicity: plant.toxicity,
          questionnaire_tags: plant.questionnaire_tags,
          tags: plant.tags,
          safetyFlags: plant.safetyFlags,
          onShelf: plant.onShelf,
          cover: plant.cover,
          updatedAt: plant.updatedAt || Date.now(),
          score: plant.score || 0,
          createdAt: Date.now()
        };
        
        await plantsCollection.add(plantDoc);
        successCount++;
        console.log(`✅ 导入植物: ${plant.name} (${plant.id})`);
        
      } catch (error) {
        errorCount++;
        console.log(`❌ 导入失败: ${plant.name} - ${error.message}`);
      }
    }
    
    console.log(`\n📊 植物数据导入完成: 成功 ${successCount}, 失败 ${errorCount}`);
    return { success: successCount, error: errorCount };
    
  } catch (error) {
    console.error('植物数据导入失败:', error);
    throw error;
  }
}

// 题库配置导入函数
async function importQuestionConfigToDatabase(dySDK) {
  try {
    console.log('📝 开始导入题库配置...');
    
    // 读取题库配置
    const configPath = path.join(__dirname, '../data/question_config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const db = dySDK.database();
    const configCollection = db.collection('question_config');
    
    // 导入配置数据
    const configDoc = {
      type: 'dynamic_questionnaire',
      version: '1.0',
      config: configData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      active: true
    };
    
    await configCollection.add(configDoc);
    console.log('✅ 题库配置导入成功');
    
    return { success: true };
    
  } catch (error) {
    console.error('题库配置导入失败:', error);
    throw error;
  }
}

// 数据导入接口
async function importAllData(event, context) {
  try {
    console.log('🚀 开始数据导入流程...');
    
    // 获取抖音云SDK
    const dySDK = context.dySDK || global.dySDK;
    if (!dySDK) {
      throw new Error('抖音云SDK未初始化');
    }
    
    const results = {
      plants: null,
      questionConfig: null,
      timestamp: new Date().toISOString()
    };
    
    // 导入植物数据
    try {
      results.plants = await importPlantsToDatabase(dySDK);
    } catch (error) {
      results.plants = { error: error.message };
    }
    
    // 导入题库配置
    try {
      results.questionConfig = await importQuestionConfigToDatabase(dySDK);
    } catch (error) {
      results.questionConfig = { error: error.message };
    }
    
    console.log('📈 数据导入完成:', results);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        message: '数据导入完成',
        results: results
      })
    };
    
  } catch (error) {
    console.error('数据导入失败:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

module.exports = {
  importAllData,
  importPlantsToDatabase,
  importQuestionConfigToDatabase
};
