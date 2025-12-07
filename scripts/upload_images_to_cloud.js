/**
 * 将PlantNet图片上传到抖音云存储
 * 并更新植物数据库中的图片URL
 */

const fs = require('fs');
const path = require('path');

// 模拟抖音云存储上传（实际需要使用抖音云SDK）
function uploadToCloudStorage(localPath, cloudPath) {
  // 这里应该调用抖音云存储API
  // 暂时返回模拟的云存储URL
  const baseUrl = 'https://your-cloud-storage.com/';
  return `${baseUrl}${cloudPath}`;
}

// 处理单个植物的图片上传
async function uploadPlantImages(plantId, plantData) {
  if (!plantData.images || plantData.images.source !== 'PlantNet') {
    console.log(`${plantId}: 没有PlantNet图片，跳过`);
    return plantData;
  }

  console.log(`开始上传 ${plantId} 的图片...`);
  const updatedFiles = [];

  for (const file of plantData.images.files) {
    const localPath = path.join(__dirname, '..', file.url);
    
    // 检查本地文件是否存在
    if (!fs.existsSync(localPath)) {
      console.warn(`本地文件不存在: ${localPath}`);
      continue;
    }

    try {
      // 生成云存储路径
      const cloudPath = `plants/${plantId}/${file.filename}`;
      
      // 上传到云存储（这里需要实际的上传逻辑）
      const cloudUrl = uploadToCloudStorage(localPath, cloudPath);
      
      // 更新文件信息
      updatedFiles.push({
        ...file,
        url: cloudUrl,
        localPath: file.url, // 保留原始本地路径作为备份
        uploadDate: new Date().toISOString()
      });

      console.log(`✅ 上传成功: ${file.filename} -> ${cloudUrl}`);
    } catch (error) {
      console.error(`❌ 上传失败: ${file.filename}`, error);
      // 保留原始URL作为降级方案
      updatedFiles.push(file);
    }
  }

  // 更新植物数据
  const updatedPlantData = {
    ...plantData,
    images: {
      ...plantData.images,
      files: updatedFiles,
      uploadDate: new Date().toISOString(),
      cloudStorage: true
    }
  };

  console.log(`${plantId}: 完成上传，成功 ${updatedFiles.length}/${plantData.images.files.length} 张图片`);
  return updatedPlantData;
}

// 更新植物数据库
async function updatePlantDatabase() {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  
  try {
    // 读取数据库
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    console.log('开始处理植物图片上传...\n');
    
    // 处理每个植物
    const updatedPlants = [];
    for (const plant of db.plants) {
      const updatedPlant = await uploadPlantImages(plant.id, plant);
      updatedPlants.push(updatedPlant);
    }
    
    // 更新数据库
    const updatedDb = {
      ...db,
      plants: updatedPlants,
      lastImageUpload: new Date().toISOString()
    };
    
    // 备份原始数据库
    const backupPath = `${dbPath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, data, 'utf8');
    console.log(`\n原始数据库已备份到: ${backupPath}`);
    
    // 保存更新后的数据库
    fs.writeFileSync(dbPath, JSON.stringify(updatedDb, null, 2), 'utf8');
    console.log(`数据库已更新: ${dbPath}`);
    
    // 生成上传报告
    generateUploadReport(updatedPlants);
    
  } catch (error) {
    console.error('更新数据库失败:', error);
  }
}

// 生成上传报告
function generateUploadReport(plants) {
  const report = {
    uploadDate: new Date().toISOString(),
    totalPlants: plants.length,
    plantsWithImages: 0,
    totalImages: 0,
    uploadedImages: 0,
    details: []
  };

  plants.forEach(plant => {
    if (plant.images && plant.images.source === 'PlantNet') {
      report.plantsWithImages++;
      const totalFiles = plant.images.files.length;
      const uploadedFiles = plant.images.files.filter(f => f.uploadDate).length;
      
      report.totalImages += totalFiles;
      report.uploadedImages += uploadedFiles;
      
      report.details.push({
        plantId: plant.id,
        name: plant.common_names.zh[0],
        totalImages: totalFiles,
        uploadedImages: uploadedFiles,
        uploadSuccess: uploadedFiles === totalFiles
      });
    }
  });

  console.log('\n=== 图片上传报告 ===');
  console.log(`上传时间: ${report.uploadDate}`);
  console.log(`总植物数: ${report.totalPlants}`);
  console.log(`有图片植物: ${report.plantsWithImages}`);
  console.log(`总图片数: ${report.totalImages}`);
  console.log(`成功上传: ${report.uploadedImages}`);
  console.log(`上传成功率: ${((report.uploadedImages / report.totalImages) * 100).toFixed(1)}%`);

  console.log('\n详细信息:');
  report.details.forEach(detail => {
    const status = detail.uploadSuccess ? '✅' : '❌';
    console.log(`${status} ${detail.name}: ${detail.uploadedImages}/${detail.totalImages}`);
  });

  // 保存报告
  const reportPath = path.join(__dirname, 'image_upload_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n详细报告已保存到: ${reportPath}`);
}

// 临时方案：使用本地图片路径（开发阶段）
function useLocalImages() {
  console.log('使用本地图片路径（开发模式）...\n');
  
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(data);
  
  // 更新图片URL为相对路径
  db.plants.forEach(plant => {
    if (plant.images && plant.images.source === 'PlantNet') {
      plant.images.files.forEach(file => {
        // 将 ./images/plantnet/... 转换为 /images/plantnet/...
        const oldUrl = file.url;
        file.url = file.url.replace('./images/', '/images/');
        console.log(`更新路径: ${oldUrl} -> ${file.url}`);
      });
      plant.images.localMode = true;
      plant.images.lastUpdate = new Date().toISOString();
    }
  });
  
  // 保存更新
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ 已更新为本地图片路径');
  console.log('注意: 需要确保小程序可以访问 /images/ 目录');
}

// 主函数
async function main() {
  console.log('=== PlantNet 图片云存储上传工具 ===\n');
  
  const args = process.argv.slice(2);
  const useLocal = args.includes('--local');
  
  if (useLocal) {
    // 开发模式：使用本地路径
    useLocalImages();
  } else {
    // 生产模式：上传到云存储
    console.log('注意: 当前为模拟模式，需要集成实际的抖音云存储API');
    console.log('使用 --local 参数可以切换到本地图片模式\n');
    await updatePlantDatabase();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  uploadPlantImages,
  updatePlantDatabase,
  useLocalImages
};
