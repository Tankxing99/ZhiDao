const fs = require('fs');
const db = JSON.parse(fs.readFileSync('plant_knowledge_database.json', 'utf8'));

console.log('植物列表:');
db.plants.forEach((p, i) => {
  const hasImages = p.images && p.images.source === 'PlantNet';
  const imageCount = hasImages ? p.images.files.length : 0;
  console.log(`${i + 1}. ${p.common_names.zh[0]} (${p.id}) - 有图片: ${hasImages ? '是' : '否'} (${imageCount}张)`);
});
