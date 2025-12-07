/**
 * PlantNet 图片资源查找器
 * 为我们的植物寻找PlantNet中的图片资源
 */

const fs = require('fs');
const path = require('path');

// 我们已确认的精确匹配
const confirmedMatches = {
  "zamioculcas_zamiifolia": {
    plantnetId: "1385937",
    scientificName: "Zamioculcas zamiifolia (Lodd.) Engl.",
    commonName: "雪铁芋",
    confidence: "exact"
  },
  "nephrolepis_exaltata": {
    plantnetId: "1356421", 
    scientificName: "Nephrolepis exaltata (L.) Schott",
    commonName: "肾蕨（波士顿蕨）",
    confidence: "exact"
  },
  "anthurium_andraeanum": {
    plantnetId: "1409238",
    scientificName: "Anthurium andraeanum Linden ex André", 
    commonName: "红掌",
    confidence: "exact"
  }
};

// 可能的属级匹配（需要进一步验证）
const potentialMatches = {
  // 多肉植物 - Sedum属有61种，可以为玉树等多肉植物提供参考
  "crassula_ovata": {
    genus: "Crassula",
    alternatives: [
      { genus: "Sedum", count: 61, note: "同为景天科多肉植物，形态相似" }
    ]
  },
  "echeveria_elegans": {
    genus: "Echeveria", 
    alternatives: [
      { genus: "Sedum", count: 61, note: "同为景天科多肉植物，莲座状形态相似" }
    ]
  },
  
  // 观叶植物 - Tradescantia属有16种，可以为吊兰等观叶植物提供参考
  "chlorophytum_comosum": {
    genus: "Chlorophytum",
    alternatives: [
      { genus: "Tradescantia", count: 16, note: "同为观叶植物，叶形相似" }
    ]
  },
  
  // 天竺葵属有23种，可以为其他开花植物提供参考
  "saintpaulia_ionantha": {
    genus: "Saintpaulia",
    alternatives: [
      { genus: "Pelargonium", count: 23, note: "同为开花观赏植物" }
    ]
  }
};

// 生成图片获取计划
function generateImagePlan() {
  const plan = {
    phase1: {
      title: "第一阶段：精确匹配植物图片获取",
      description: "获取3个精确匹配植物的高质量图片",
      plants: [],
      estimatedImages: 0
    },
    phase2: {
      title: "第二阶段：替代图片获取", 
      description: "为其他植物寻找同科或形态相似的替代图片",
      plants: [],
      estimatedImages: 0
    },
    phase3: {
      title: "第三阶段：通用植物图片补充",
      description: "使用PlantNet中的通用植物图片作为占位符",
      plants: [],
      estimatedImages: 0
    }
  };

  // 第一阶段：精确匹配
  Object.entries(confirmedMatches).forEach(([plantId, match]) => {
    plan.phase1.plants.push({
      id: plantId,
      name: match.commonName,
      scientificName: match.scientificName,
      plantnetId: match.plantnetId,
      imageStrategy: "直接下载PlantNet中的所有图片",
      expectedImages: "5-20张不同角度的高质量图片"
    });
    plan.phase1.estimatedImages += 10; // 平均每个植物10张图片
  });

  // 第二阶段：替代匹配
  Object.entries(potentialMatches).forEach(([plantId, match]) => {
    plan.phase2.plants.push({
      id: plantId,
      originalGenus: match.genus,
      alternatives: match.alternatives,
      imageStrategy: "选择形态最相似的同科植物图片",
      expectedImages: "2-5张代表性图片"
    });
    plan.phase2.estimatedImages += 3; // 平均每个植物3张图片
  });

  // 第三阶段：其他植物
  const ourPlants = loadOurPlants();
  const coveredPlants = new Set([
    ...Object.keys(confirmedMatches),
    ...Object.keys(potentialMatches)
  ]);

  ourPlants.forEach(plant => {
    if (!coveredPlants.has(plant.id)) {
      plan.phase3.plants.push({
        id: plant.id,
        name: plant.common_names.zh[0],
        scientificName: plant.scientific_name,
        imageStrategy: "使用通用室内植物图片或寻找外部图片资源",
        expectedImages: "1-2张通用图片"
      });
      plan.phase3.estimatedImages += 1;
    }
  });

  return plan;
}

// 生成PlantNet图片URL
function generatePlantNetImageUrls(plantnetId, imageCount = 5) {
  // PlantNet图片URL格式（需要根据实际API确认）
  const baseUrl = "https://bs.plantnet.org/image/o/";
  const urls = [];
  
  // 这里需要根据PlantNet的实际图片存储结构来生成URL
  // 暂时使用占位符格式
  for (let i = 1; i <= imageCount; i++) {
    urls.push(`${baseUrl}${plantnetId}_${i}.jpg`);
  }
  
  return urls;
}

// 创建图片下载脚本
function createDownloadScript(plan) {
  let script = `#!/bin/bash
# PlantNet 图片下载脚本
# 自动生成于 ${new Date().toISOString()}

mkdir -p images/plantnet
cd images/plantnet

echo "开始下载 PlantNet 植物图片..."

`;

  // 第一阶段：精确匹配的图片
  script += `\n# 第一阶段：精确匹配植物图片\n`;
  plan.phase1.plants.forEach(plant => {
    script += `\necho "下载 ${plant.name} (${plant.scientificName}) 的图片..."\n`;
    script += `mkdir -p ${plant.id}\n`;
    
    const imageUrls = generatePlantNetImageUrls(plant.plantnetId);
    imageUrls.forEach((url, index) => {
      script += `curl -L "${url}" -o "${plant.id}/${plant.id}_${index + 1}.jpg" || echo "图片 ${index + 1} 下载失败"\n`;
    });
  });

  script += `\necho "图片下载完成！"\n`;
  script += `echo "请检查 images/plantnet 目录中的图片文件"\n`;

  return script;
}

// 读取我们的植物数据库
function loadOurPlants() {
  try {
    const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    return db.plants || [];
  } catch (error) {
    console.error('读取植物数据库失败:', error);
    return [];
  }
}

// 生成实施报告
function generateImplementationReport() {
  console.log('\n=== PlantNet 图片资源获取实施计划 ===\n');
  
  const plan = generateImagePlan();
  
  // 输出各阶段计划
  Object.values(plan).forEach(phase => {
    console.log(`${phase.title}:`);
    console.log(`${phase.description}`);
    console.log(`预计图片数量: ${phase.estimatedImages} 张`);
    console.log(`涉及植物: ${phase.plants.length} 种\n`);
    
    if (phase.plants.length > 0) {
      phase.plants.forEach((plant, index) => {
        console.log(`  ${index + 1}. ${plant.name || plant.id}`);
        if (plant.scientificName) {
          console.log(`     学名: ${plant.scientificName}`);
        }
        if (plant.plantnetId) {
          console.log(`     PlantNet ID: ${plant.plantnetId}`);
        }
        console.log(`     策略: ${plant.imageStrategy}`);
        console.log(`     预期: ${plant.expectedImages}\n`);
      });
    }
  });

  // 总结
  const totalImages = Object.values(plan).reduce((sum, phase) => sum + phase.estimatedImages, 0);
  const totalPlants = Object.values(plan).reduce((sum, phase) => sum + phase.plants.length, 0);
  
  console.log(`总计划概览:`);
  console.log(`- 涉及植物总数: ${totalPlants} 种`);
  console.log(`- 预计图片总数: ${totalImages} 张`);
  console.log(`- 精确匹配植物: ${plan.phase1.plants.length} 种`);
  console.log(`- 替代匹配植物: ${plan.phase2.plants.length} 种`);
  console.log(`- 需要其他方案植物: ${plan.phase3.plants.length} 种`);

  // 保存计划到文件
  const planPath = path.join(__dirname, 'plantnet_image_plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
  console.log(`\n详细实施计划已保存到: ${planPath}`);

  // 生成下载脚本
  const downloadScript = createDownloadScript(plan);
  const scriptPath = path.join(__dirname, 'download_plantnet_images.sh');
  fs.writeFileSync(scriptPath, downloadScript, 'utf8');
  console.log(`图片下载脚本已生成: ${scriptPath}`);

  return plan;
}

// 主函数
function main() {
  console.log('生成 PlantNet 图片资源获取计划...');
  generateImplementationReport();
}

if (require.main === module) {
  main();
}

module.exports = { generateImagePlan, confirmedMatches, potentialMatches };
