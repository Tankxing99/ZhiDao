/**
 * PlantNet 图片下载器
 * 从PlantNet下载我们植物的高质量图片
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 雪铁芋的图片URL列表（从PlantNet页面提取）
const zamioculcasImages = [
  // 花朵图片
  'https://bs.plantnet.org/image/o/836e6fde61fa7ee42986db633af6a78ae4c93895',
  'https://bs.plantnet.org/image/o/5bbf07738c2e86e48c7ef78d746796d06cbd2807',
  'https://bs.plantnet.org/image/o/5104210d993dc281d2b3814647eca7f4c2ef07be',
  
  // 叶片图片
  'https://bs.plantnet.org/image/o/eee5c19064979f58eff0d0d7d655ff1dfa276722',
  'https://bs.plantnet.org/image/o/d4a7dfbbccba664da1a9b71d2059f3cf9657c8f3',
  'https://bs.plantnet.org/image/o/f6980da630fb717f6119152ea55efb9d7caad97b',
  'https://bs.plantnet.org/image/o/9761920ac3b954b9726d1cec99897836c9760d34',
  'https://bs.plantnet.org/image/o/4adacdae265bf11982a963c05a189ecc92161385',
  
  // 茎干图片
  'https://bs.plantnet.org/image/o/4d1ce88644d83a6ecf82ee4c6f2d3013e4a98d06',
  'https://bs.plantnet.org/image/o/19a749d5ff53f9541ab3a37128d5970bcbb38673',
  
  // 整株图片
  'https://bs.plantnet.org/image/o/71d3c515725aa98e35d933e1268484e8b21903b7',
  'https://bs.plantnet.org/image/o/46377593eaaf1ae36be25c99ad8d4ce3e7f32241',
  'https://bs.plantnet.org/image/o/3a79973786b03e03e345aa263139cc93ead85338',
  'https://bs.plantnet.org/image/o/7ec5f4bf9579c7043027c5f35673169af43a1ab4'
];

// 创建目录
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 下载单个图片
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ 下载完成: ${path.basename(filepath)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // 删除不完整的文件
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 批量下载图片
async function downloadPlantImages(plantId, imageUrls, plantName) {
  const outputDir = path.join(__dirname, '../images/plantnet', plantId);
  ensureDir(outputDir);
  
  console.log(`\n开始下载 ${plantName} 的图片...`);
  console.log(`目标目录: ${outputDir}`);
  console.log(`图片数量: ${imageUrls.length}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const filename = `${plantId}_${i + 1}.jpg`;
    const filepath = path.join(outputDir, filename);
    
    try {
      console.log(`正在下载 ${i + 1}/${imageUrls.length}: ${filename}`);
      await downloadImage(url, filepath);
      successCount++;
      
      // 添加延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ 下载失败 ${filename}: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n${plantName} 下载完成:`);
  console.log(`✅ 成功: ${successCount} 张`);
  console.log(`❌ 失败: ${failCount} 张`);
  
  return { success: successCount, failed: failCount };
}

// 生成图片清单
function generateImageManifest(plantId, plantName, imageCount) {
  const manifest = {
    plantId: plantId,
    plantName: plantName,
    downloadDate: new Date().toISOString(),
    totalImages: imageCount,
    images: []
  };
  
  for (let i = 1; i <= imageCount; i++) {
    manifest.images.push({
      filename: `${plantId}_${i}.jpg`,
      type: i <= 3 ? 'flower' : i <= 8 ? 'leaf' : i <= 10 ? 'bark' : 'habit',
      url: `./images/plantnet/${plantId}/${plantId}_${i}.jpg`
    });
  }
  
  const manifestPath = path.join(__dirname, '../images/plantnet', plantId, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`📋 图片清单已生成: ${manifestPath}`);
  
  return manifest;
}

// 更新植物数据库，添加图片信息
function updatePlantDatabase(plantId, manifest) {
  try {
    const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    const plant = db.plants.find(p => p.id === plantId);
    if (plant) {
      plant.images = {
        source: 'PlantNet',
        downloadDate: manifest.downloadDate,
        totalCount: manifest.totalImages,
        files: manifest.images
      };
      
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      console.log(`📝 植物数据库已更新: ${plant.common_names.zh[0]}`);
    }
  } catch (error) {
    console.error('更新植物数据库失败:', error);
  }
}

// 主函数
async function main() {
  console.log('=== PlantNet 图片下载器 ===\n');
  
  try {
    // 下载雪铁芋图片
    const result = await downloadPlantImages(
      'zamioculcas_zamiifolia',
      zamioculcasImages,
      '雪铁芋'
    );
    
    if (result.success > 0) {
      // 生成图片清单
      const manifest = generateImageManifest(
        'zamioculcas_zamiifolia',
        '雪铁芋',
        result.success
      );
      
      // 更新植物数据库
      updatePlantDatabase('zamioculcas_zamiifolia', manifest);
    }
    
    console.log('\n🎉 下载任务完成！');
    console.log('\n下一步建议:');
    console.log('1. 检查下载的图片质量');
    console.log('2. 为其他植物寻找PlantNet图片');
    console.log('3. 集成图片到推荐结果页面');
    
  } catch (error) {
    console.error('下载过程中发生错误:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  downloadPlantImages,
  generateImageManifest,
  updatePlantDatabase
};
