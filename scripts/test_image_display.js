/**
 * 测试推荐结果页面的图片显示逻辑
 */

const fs = require('fs');
const path = require('path');

// 读取植物数据库
function loadPlantDatabase() {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// 模拟推荐结果页面的图片获取逻辑
function getPlantDisplayImage(plant) {
  // 优先使用PlantNet图片
  if (plant.images && plant.images.source === 'PlantNet' && plant.images.files && plant.images.files.length > 0) {
    // 优先选择整株图片，其次是叶片图片
    const habitImages = plant.images.files.filter(img => img.type === 'habit');
    const leafImages = plant.images.files.filter(img => img.type === 'leaf');
    
    if (habitImages.length > 0) {
      return {
        url: habitImages[0].url,
        source: 'PlantNet',
        type: 'habit',
        hasMultiple: plant.images.files.length > 1
      };
    } else if (leafImages.length > 0) {
      return {
        url: leafImages[0].url,
        source: 'PlantNet', 
        type: 'leaf',
        hasMultiple: plant.images.files.length > 1
      };
    } else {
      return {
        url: plant.images.files[0].url,
        source: 'PlantNet',
        type: plant.images.files[0].type,
        hasMultiple: plant.images.files.length > 1
      };
    }
  }
  
  // 降级到原始cover图片
  if (plant.cover) {
    return {
      url: plant.cover,
      source: 'original',
      type: 'cover',
      hasMultiple: false
    };
  }
  
  // 默认占位图片
  return {
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGZpbGw9IiNGNUY1RjciLz4KICA8IS0tIOiKseeUsyAtLT4KICA8cGF0aCBkPSJNMzIgNzJINjRMNjAgNTZIMzZMMzIgNzJaIiBmaWxsPSIjOEU4RTkzIiBvcGFjaXR5PSIwLjMiLz4KICA8IS0tIOakreeJqeiMjuW5siAtLT4KICA8cGF0aCBkPSJNNDggNTZWNDAiIHN0cm9rZT0iIzM0Qzc1OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIOWPtuWtkCAtLT4KICA8cGF0aCBkPSJNNDggNDVDNTIgNDEgNTggNDMgNTYgNDhDNTggNTMgNTIgNTUgNDggNTEiIGZpbGw9IiMzNEM3NTkiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik00OCA0NUM0NCA0MSAzOCA0MyA0MCA0OEMzOCA1MyA0NCA1NSA0OCA1MSIgZmlsbD0iIzM0Qzc1OSIgb3BhY2l0eT0iMC42Ii8+CiAgPCEtLSDoi7HmnLUgLS0+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0ZGOTUwMCIgb3BhY2l0eT0iMC43Ii8+CiAgPGNpcmNsZSBjeD0iNDUiIGN5PSIzMiIgcj0iMiIgZmlsbD0iI0ZGRDYwQSIvPgogIDxjaXJjbGUgY3g9IjUxIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNGRkQ2MEEiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjM4IiByPSIyIiBmaWxsPSIjRkZENjBBIi8+Cjwvc3ZnPg==',
    source: 'placeholder',
    type: 'placeholder',
    hasMultiple: false
  };
}

// 测试图片显示逻辑
function testImageDisplay() {
  console.log('=== 推荐结果页面图片显示测试 ===\n');
  
  const db = loadPlantDatabase();
  const testResults = [];
  
  // 测试包含雪铁芋的植物（模拟推荐结果）
  const testPlants = [
    db.plants.find(p => p.id === 'zamioculcas_zamiifolia'), // 雪铁芋
    ...db.plants.slice(0, 4) // 前4个植物
  ].filter(Boolean);
  
  testPlants.forEach((plant, index) => {
    console.log(`${index + 1}. ${plant.common_names.zh[0]} (${plant.id})`);
    
    const displayImage = getPlantDisplayImage(plant);
    console.log(`   图片来源: ${displayImage.source}`);
    console.log(`   图片类型: ${displayImage.type}`);
    console.log(`   多图片: ${displayImage.hasMultiple ? '是' : '否'}`);
    console.log(`   URL: ${displayImage.url.substring(0, 80)}${displayImage.url.length > 80 ? '...' : ''}`);
    
    // 检查本地文件是否存在（仅对本地图片）
    if (displayImage.source === 'PlantNet' && displayImage.url.startsWith('/images/')) {
      const localPath = path.join(__dirname, '..', displayImage.url);
      const exists = fs.existsSync(localPath);
      console.log(`   本地文件: ${exists ? '✅ 存在' : '❌ 不存在'}`);
      
      if (exists) {
        const stats = fs.statSync(localPath);
        console.log(`   文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
      }
    }
    
    testResults.push({
      plantId: plant.id,
      plantName: plant.common_names.zh[0],
      imageSource: displayImage.source,
      imageType: displayImage.type,
      hasMultiple: displayImage.hasMultiple,
      url: displayImage.url,
      fileExists: displayImage.source === 'PlantNet' ? 
        fs.existsSync(path.join(__dirname, '..', displayImage.url)) : null
    });
    
    console.log('');
  });
  
  // 生成测试报告
  console.log('=== 测试总结 ===');
  const plantNetImages = testResults.filter(r => r.imageSource === 'PlantNet');
  const placeholderImages = testResults.filter(r => r.imageSource === 'placeholder');
  const originalImages = testResults.filter(r => r.imageSource === 'original');
  
  console.log(`PlantNet图片: ${plantNetImages.length} 个`);
  console.log(`原始图片: ${originalImages.length} 个`);
  console.log(`占位图片: ${placeholderImages.length} 个`);
  
  if (plantNetImages.length > 0) {
    const existingFiles = plantNetImages.filter(r => r.fileExists).length;
    console.log(`PlantNet图片文件存在: ${existingFiles}/${plantNetImages.length}`);
  }
  
  // 保存测试结果
  const reportPath = path.join(__dirname, 'image_display_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    testDate: new Date().toISOString(),
    totalPlants: testResults.length,
    results: testResults,
    summary: {
      plantNetImages: plantNetImages.length,
      originalImages: originalImages.length,
      placeholderImages: placeholderImages.length,
      filesExisting: plantNetImages.filter(r => r.fileExists).length
    }
  }, null, 2), 'utf8');
  
  console.log(`\n详细测试报告已保存到: ${reportPath}`);
}

// 生成小程序测试数据
function generateMiniProgramTestData() {
  console.log('\n=== 生成小程序测试数据 ===');
  
  const db = loadPlantDatabase();
  
  // 模拟推荐结果数据
  const mockRecommendations = db.plants.slice(0, 5).map((plant, index) => {
    const displayImage = getPlantDisplayImage(plant);
    
    return {
      id: plant.id,
      name: plant.common_names.zh[0],
      tags: ['室内植物', '易养护'], // 模拟标签
      cover: plant.cover || '', // 原始封面图
      _displayImage: displayImage,
      _reasonText: `契合:光照需求  兼容:空间大小`, // 模拟推荐理由
      score: 90 - index * 5 // 模拟评分
    };
  });
  
  // 保存测试数据
  const testDataPath = path.join(__dirname, 'miniprogram_test_data.json');
  fs.writeFileSync(testDataPath, JSON.stringify({
    generateDate: new Date().toISOString(),
    description: '小程序推荐结果页面测试数据',
    recommendations: mockRecommendations
  }, null, 2), 'utf8');
  
  console.log(`小程序测试数据已生成: ${testDataPath}`);
  console.log(`包含 ${mockRecommendations.length} 个推荐结果`);
  
  // 显示第一个结果的详细信息
  if (mockRecommendations.length > 0) {
    const first = mockRecommendations[0];
    console.log(`\n示例数据 - ${first.name}:`);
    console.log(`  图片URL: ${first._displayImage.url.substring(0, 60)}...`);
    console.log(`  图片来源: ${first._displayImage.source}`);
    console.log(`  图片类型: ${first._displayImage.type}`);
    console.log(`  多图片: ${first._displayImage.hasMultiple}`);
  }
}

// 主函数
function main() {
  testImageDisplay();
  generateMiniProgramTestData();
}

if (require.main === module) {
  main();
}

module.exports = {
  getPlantDisplayImage,
  testImageDisplay,
  generateMiniProgramTestData
};
