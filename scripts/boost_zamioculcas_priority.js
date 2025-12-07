/**
 * 临时提升雪铁芋在推荐结果中的优先级
 * 通过调整植物数据库顺序或添加权重来确保雪铁芋出现在前5名
 */

const fs = require('fs');
const path = require('path');

// 读取植物数据库
function loadPlantDatabase() {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// 保存植物数据库
function savePlantDatabase(db) {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  
  // 备份原始文件
  const backupPath = `${dbPath}.backup.${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`原始数据库已备份到: ${backupPath}`);
  
  // 保存更新后的数据库
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('植物数据库已更新');
}

// 方法1：调整植物顺序，将雪铁芋移到前面
function moveZamioculcasToFront() {
  console.log('=== 方法1：调整植物顺序 ===');
  
  const db = loadPlantDatabase();
  const plants = db.plants;
  
  // 找到雪铁芋
  const zamioculcasIndex = plants.findIndex(p => p.id === 'zamioculcas_zamiifolia');
  if (zamioculcasIndex === -1) {
    console.error('❌ 未找到雪铁芋');
    return false;
  }
  
  console.log(`雪铁芋当前位置: 第 ${zamioculcasIndex + 1} 位`);
  
  // 将雪铁芋移到第3位（确保在前5名中）
  const zamioculcas = plants.splice(zamioculcasIndex, 1)[0];
  plants.splice(2, 0, zamioculcas); // 插入到第3位（索引2）
  
  // 更新数据库
  db.plants = plants;
  savePlantDatabase(db);
  
  console.log('✅ 雪铁芋已移动到第3位');
  return true;
}

// 方法2：为雪铁芋添加推荐权重
function addZamioculcasBoost() {
  console.log('=== 方法2：添加推荐权重 ===');
  
  const db = loadPlantDatabase();
  const zamioculcas = db.plants.find(p => p.id === 'zamioculcas_zamiifolia');
  
  if (!zamioculcas) {
    console.error('❌ 未找到雪铁芋');
    return false;
  }
  
  // 添加推荐权重和特殊标识
  zamioculcas.recommendation_boost = {
    priority: 'high',
    reason: 'has_plantnet_images',
    boost_score: 2.0,
    added_date: new Date().toISOString()
  };
  
  // 添加更多匹配标签
  if (!zamioculcas.tags.includes('featured')) {
    zamioculcas.tags.push('featured');
  }
  if (!zamioculcas.tags.includes('drought-tolerant')) {
    zamioculcas.tags.push('drought-tolerant');
  }
  
  savePlantDatabase(db);
  
  console.log('✅ 雪铁芋已添加推荐权重');
  return true;
}

// 方法3：修改推荐结果页面逻辑，优先显示有图片的植物
function createImagePriorityLogic() {
  console.log('=== 方法3：创建图片优先逻辑 ===');
  
  const logicCode = `
// 在 pages/result/index.js 的 onShow 方法中添加以下逻辑：

// 原有的推荐结果处理
const enhanced = (list || []).map((item)=>{
  // ... 现有逻辑 ...
});

// 新增：优先显示有PlantNet图片的植物
const sortedList = enhanced.sort((a, b) => {
  // 首先按是否有PlantNet图片排序
  const aHasImages = a.images && a.images.source === 'PlantNet' ? 1 : 0;
  const bHasImages = b.images && b.images.source === 'PlantNet' ? 1 : 0;
  
  if (aHasImages !== bHasImages) {
    return bHasImages - aHasImages; // 有图片的排在前面
  }
  
  // 然后按推荐评分排序
  const aScore = a._reason?.score || 0;
  const bScore = b._reason?.score || 0;
  
  if (aScore !== bScore) {
    return bScore - aScore; // 评分高的排在前面
  }
  
  // 最后按更新时间排序
  return (b.updatedAt || 0) - (a.updatedAt || 0);
});

// 限制显示最多5个推荐结果
const limitedList = sortedList.slice(0, 5);
this.setData({ list: limitedList });
`;

  const logicPath = path.join(__dirname, 'image_priority_logic.js');
  fs.writeFileSync(logicPath, logicCode, 'utf8');
  
  console.log(`图片优先逻辑代码已生成: ${logicPath}`);
  console.log('请手动将此逻辑添加到 pages/result/index.js 中');
  
  return true;
}

// 验证雪铁芋位置
function verifyZamioculcasPosition() {
  console.log('=== 验证雪铁芋位置 ===');
  
  const db = loadPlantDatabase();
  const zamioculcasIndex = db.plants.findIndex(p => p.id === 'zamioculcas_zamiifolia');
  
  if (zamioculcasIndex === -1) {
    console.error('❌ 未找到雪铁芋');
    return false;
  }
  
  console.log(`雪铁芋当前位置: 第 ${zamioculcasIndex + 1} 位`);
  
  if (zamioculcasIndex < 5) {
    console.log('✅ 雪铁芋在前5位，会出现在推荐结果中');
  } else {
    console.log('❌ 雪铁芋不在前5位，不会出现在推荐结果中');
  }
  
  // 显示前5个植物
  console.log('\n前5个植物:');
  db.plants.slice(0, 5).forEach((plant, index) => {
    const hasImages = plant.images && plant.images.source === 'PlantNet';
    const imageIcon = hasImages ? '📸' : '🖼️';
    console.log(`${index + 1}. ${plant.common_names.zh[0]} ${imageIcon}`);
  });
  
  return zamioculcasIndex < 5;
}

// 主函数
function main() {
  console.log('=== 雪铁芋优先级提升工具 ===\n');
  
  const args = process.argv.slice(2);
  const method = args[0] || 'move';
  
  switch (method) {
    case 'move':
      moveZamioculcasToFront();
      break;
    case 'boost':
      addZamioculcasBoost();
      break;
    case 'logic':
      createImagePriorityLogic();
      break;
    case 'verify':
      verifyZamioculcasPosition();
      return;
    default:
      console.log('使用方法:');
      console.log('  node boost_zamioculcas_priority.js move   - 移动雪铁芋到前面');
      console.log('  node boost_zamioculcas_priority.js boost  - 添加推荐权重');
      console.log('  node boost_zamioculcas_priority.js logic  - 生成图片优先逻辑');
      console.log('  node boost_zamioculcas_priority.js verify - 验证当前位置');
      return;
  }
  
  // 验证结果
  setTimeout(() => {
    console.log('\n验证结果:');
    verifyZamioculcasPosition();
  }, 100);
}

if (require.main === module) {
  main();
}

module.exports = {
  moveZamioculcasToFront,
  addZamioculcasBoost,
  createImagePriorityLogic,
  verifyZamioculcasPosition
};
