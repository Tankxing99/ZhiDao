/**
 * 测试雪铁芋推荐匹配
 * 生成能够匹配到雪铁芋的问卷答案
 */

const fs = require('fs');
const path = require('path');

// 读取植物数据库
function loadPlantDatabase() {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// 读取推荐算法
const { getRecommendationReason } = require('../utils/recommend');

// 生成匹配雪铁芋的问卷答案（数组格式）
function generateZamioculcasAnswers() {
  // 雪铁芋的特征：
  // - light: "low" (低光照)
  // - space: "medium" (中等空间)
  // - level: "beginner" (新手友好)
  // - tags: ["low", "medium", "beginner"]
  // - 特殊特征：drought tolerant, waxy leaves, rare flowering

  return [
    // 核心匹配维度 - 确保雪铁芋获得高分
    { id: 'light', value: 'low' },           // 低光照环境
    { id: 'space', value: 'medium' },        // 中等空间
    { id: 'level', value: 'beginner' },      // 新手水平

    // 增加区分度的问题 - 雪铁芋的独特优势
    { id: 'lightCondition', value: 'low' },
    { id: 'spaceType', value: 'medium' },
    { id: 'experienceLevel', value: 'beginner' },
    { id: 'careTime', value: 'low' },        // 雪铁芋低维护
    { id: 'wateringFrequency', value: 'low' }, // 雪铁芋耐旱
    { id: 'plantShape', value: 'upright' },   // 雪铁芋直立形态
    { id: 'colorPreference', value: 'green' },
    { id: 'hasPets', value: false },          // 雪铁芋对宠物有毒，适合无宠物家庭
    { id: 'hasAllergies', value: false },
    { id: 'humidity', value: 'low' },         // 雪铁芋适合低湿度
    { id: 'temperature', value: 'normal' },
    { id: 'preferredStyle', value: 'modern' },
    { id: 'plantSize', value: 'medium' },

    // 添加更多雪铁芋特有的匹配条件
    { id: 'droughtTolerant', value: true },   // 耐旱特性
    { id: 'lowMaintenance', value: true },    // 低维护
    { id: 'modernStyle', value: true },       // 现代风格
    { id: 'glossyLeaves', value: true }       // 光泽叶片
  ];
}

// 测试推荐匹配
function testZamioculcasRecommendation() {
  console.log('=== 雪铁芋推荐匹配测试 ===\n');
  
  const db = loadPlantDatabase();
  const zamioculcas = db.plants.find(p => p.id === 'zamioculcas_zamiifolia');
  
  if (!zamioculcas) {
    console.error('❌ 未找到雪铁芋数据');
    return;
  }
  
  console.log('雪铁芋信息:');
  console.log(`- 中文名: ${zamioculcas.common_names.zh[0]}`);
  console.log(`- 学名: ${zamioculcas.scientific_name}`);
  console.log(`- 标签: ${zamioculcas.tags.join(', ')}`);
  console.log(`- 光照偏好: ${zamioculcas.environment.light_preference}`);
  console.log(`- 空间需求: ${zamioculcas.environment.space}`);
  console.log(`- 养护难度: ${zamioculcas.care.difficulty}`);
  console.log(`- 有图片: ${zamioculcas.images ? '是' : '否'} (${zamioculcas.images?.files?.length || 0}张)`);
  
  // 生成匹配的问卷答案
  const answers = generateZamioculcasAnswers();
  console.log('\n生成的问卷答案:');
  answers.forEach(answer => {
    console.log(`- ${answer.id}: ${answer.value}`);
  });
  
  // 测试推荐匹配
  console.log('\n=== 推荐匹配测试 ===');
  
  try {
    const reason = getRecommendationReason(answers, zamioculcas);
    console.log('推荐理由:', reason);
    
    if (reason && reason.score > 0) {
      console.log(`✅ 匹配成功！评分: ${reason.score}`);
      console.log(`精确匹配: ${reason.exactMatches?.join(', ') || '无'}`);
      console.log(`兼容匹配: ${reason.compatibleMatches?.join(', ') || '无'}`);
    } else {
      console.log('❌ 匹配失败，评分为0');
    }
  } catch (error) {
    console.error('推荐算法错误:', error);
  }
  
  // 测试所有植物的匹配情况
  console.log('\n=== 所有植物匹配情况 ===');
  const allResults = [];
  
  db.plants.forEach(plant => {
    try {
      const reason = getRecommendationReason(answers, plant);
      allResults.push({
        name: plant.common_names.zh[0],
        id: plant.id,
        score: reason?.score || 0,
        hasImages: plant.images && plant.images.source === 'PlantNet'
      });
    } catch (error) {
      console.error(`处理植物 ${plant.id} 时出错:`, error);
    }
  });
  
  // 按评分排序
  allResults.sort((a, b) => b.score - a.score);
  
  console.log('推荐排序结果（前10名）:');
  allResults.slice(0, 10).forEach((result, index) => {
    const imageIcon = result.hasImages ? '📸' : '🖼️';
    console.log(`${index + 1}. ${result.name} - 评分: ${result.score} ${imageIcon}`);
  });
  
  // 检查雪铁芋的排名
  const zamioculcasRank = allResults.findIndex(r => r.id === 'zamioculcas_zamiifolia') + 1;
  console.log(`\n雪铁芋排名: 第 ${zamioculcasRank} 名`);
  
  if (zamioculcasRank <= 5) {
    console.log('✅ 雪铁芋会出现在推荐结果中（前5名）');
  } else {
    console.log('❌ 雪铁芋不会出现在推荐结果中（超出前5名）');
  }
  
  return {
    answers,
    zamioculcasScore: allResults.find(r => r.id === 'zamioculcas_zamiifolia')?.score || 0,
    zamioculcasRank,
    topResults: allResults.slice(0, 5)
  };
}

// 生成小程序测试用的问卷答案
function generateMiniProgramAnswers() {
  const testResult = testZamioculcasRecommendation();
  
  if (testResult.zamioculcasRank <= 5) {
    console.log('\n=== 小程序测试答案 ===');
    console.log('将以下答案输入小程序问卷，可以看到雪铁芋推荐:');
    console.log(JSON.stringify(testResult.answers, null, 2));
    
    // 保存到文件
    const answersPath = path.join(__dirname, 'zamioculcas_test_answers.json');
    fs.writeFileSync(answersPath, JSON.stringify({
      description: '能够匹配到雪铁芋的问卷答案',
      generateDate: new Date().toISOString(),
      expectedRank: testResult.zamioculcasRank,
      expectedScore: testResult.zamioculcasScore,
      answers: testResult.answers,
      topResults: testResult.topResults
    }, null, 2), 'utf8');
    
    console.log(`\n测试答案已保存到: ${answersPath}`);
  }
  
  return testResult;
}

// 主函数
function main() {
  generateMiniProgramAnswers();
}

if (require.main === module) {
  main();
}

module.exports = {
  generateZamioculcasAnswers,
  testZamioculcasRecommendation,
  generateMiniProgramAnswers
};
