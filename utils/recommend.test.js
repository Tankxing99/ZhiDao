/**
 * 推荐算法测试文件
 * 用于验证推荐算法的正确性
 */

const { recommend, getRecommendationReason, PlantRecommender } = require('./recommend');

// 测试数据
const testPlants = [
  {
    id: "p1",
    name: "虎皮兰",
    tags: ["low", "small", "beginner"],
    onShelf: true,
    cover: "https://example-cdn/plant1.jpg",
    updatedAt: 1754660000000
  },
  {
    id: "p2", 
    name: "绿萝",
    tags: ["low", "medium", "beginner"],
    onShelf: true,
    cover: "https://example-cdn/plant2.jpg",
    updatedAt: 1754661000000
  },
  {
    id: "p3",
    name: "琴叶榕",
    tags: ["high", "large", "intermediate"],
    onShelf: false, // 下架植物
    cover: "https://example-cdn/plant3.jpg",
    updatedAt: 1754662000000
  },
  {
    id: "p4",
    name: "发财树",
    tags: ["medium", "large", "beginner"],
    onShelf: true,
    cover: "https://example-cdn/plant4.jpg",
    updatedAt: 1754663000000
  },
  {
    id: "p5",
    name: "龟背竹",
    tags: ["medium", "large", "intermediate"],
    onShelf: true,
    cover: "https://example-cdn/plant5.jpg",
    updatedAt: 1754664000000
  }
];

// 测试用例
function runTests() {
  console.log('=== 植物推荐算法测试 ===\n');
  
  // 测试1：新手用户，弱光，小空间
  console.log('测试1：新手用户，弱光，小空间');
  const answers1 = [
    { id: 'light', value: 'low' },
    { id: 'space', value: 'small' },
    { id: 'level', value: 'beginner' }
  ];
  const result1 = recommend(answers1, testPlants, { topN: 3 });
  console.log('推荐结果：');
  result1.forEach((plant, index) => {
    const reason = getRecommendationReason(answers1, plant);
    console.log(`${index + 1}. ${plant.name} (分数: ${plant.score})`);
    console.log(`   精确匹配: ${reason.exactMatches.join(', ') || '无'}`);
    console.log(`   兼容匹配: ${reason.compatibleMatches.join(', ') || '无'}`);
  });
  console.log('');

  // 测试2：达人用户，充足光照，大空间
  console.log('测试2：达人用户，充足光照，大空间');
  const answers2 = [
    { id: 'light', value: 'high' },
    { id: 'space', value: 'large' },
    { id: 'level', value: 'expert' }
  ];
  const result2 = recommend(answers2, testPlants, { topN: 3 });
  console.log('推荐结果：');
  result2.forEach((plant, index) => {
    const reason = getRecommendationReason(answers2, plant);
    console.log(`${index + 1}. ${plant.name} (分数: ${plant.score})`);
    console.log(`   精确匹配: ${reason.exactMatches.join(', ') || '无'}`);
    console.log(`   兼容匹配: ${reason.compatibleMatches.join(', ') || '无'}`);
  });
  console.log('');

  // 测试3：进阶用户，中等光照，中等空间
  console.log('测试3：进阶用户，中等光照，中等空间');
  const answers3 = [
    { id: 'light', value: 'medium' },
    { id: 'space', value: 'medium' },
    { id: 'level', value: 'intermediate' }
  ];
  const result3 = recommend(answers3, testPlants, { topN: 3 });
  console.log('推荐结果：');
  result3.forEach((plant, index) => {
    const reason = getRecommendationReason(answers3, plant);
    console.log(`${index + 1}. ${plant.name} (分数: ${plant.score})`);
    console.log(`   精确匹配: ${reason.exactMatches.join(', ') || '无'}`);
    console.log(`   兼容匹配: ${reason.compatibleMatches.join(', ') || '无'}`);
  });
  console.log('');

  // 测试4：边界情况 - 空植物列表
  console.log('测试4：边界情况 - 空植物列表');
  const result4 = recommend(answers1, [], { topN: 3 });
  console.log('推荐结果：', result4.length === 0 ? '空列表（正确）' : '错误');
  console.log('');

  // 测试5：边界情况 - 所有植物都下架
  console.log('测试5：边界情况 - 所有植物都下架');
  const offShelfPlants = testPlants.map(p => ({ ...p, onShelf: false }));
  const result5 = recommend(answers1, offShelfPlants, { topN: 3 });
  console.log('推荐结果：', result5.length === 0 ? '空列表（正确）' : '错误');
  console.log('');

  // 测试6：自定义权重
  console.log('测试6：自定义权重测试');
  const customRecommender = new PlantRecommender();
  customRecommender.weights = { light: 2.0, space: 0.5, level: 1.0 }; // 更重视光照
  const result6 = customRecommender.recommend(answers1, testPlants, { topN: 3 });
  console.log('自定义权重推荐结果：');
  result6.forEach((plant, index) => {
    console.log(`${index + 1}. ${plant.name} (分数: ${plant.score})`);
  });
  console.log('');

  console.log('=== 测试完成 ===');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testPlants
};
