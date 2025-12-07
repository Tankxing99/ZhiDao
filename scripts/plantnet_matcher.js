/**
 * PlantNet-300K 植物匹配分析脚本
 * 分析我们的植物数据库与PlantNet-300K数据集的匹配情况
 */

const fs = require('fs');
const path = require('path');

// PlantNet-300K 物种ID到学名的映射（从API获取的完整数据）
const plantnetSpecies = {
  // 精确匹配的重要物种
  "1385937": "Zamioculcas zamiifolia (Lodd.) Engl.",
  "1356421": "Nephrolepis exaltata (L.) Schott",
  "1409238": "Anthurium andraeanum Linden ex André",

  // Ficus 属 - 榕属
  "1149": "Ficus lyrata",  // 这个需要验证

  // Epipremnum 属 - 麒麟叶属
  "1104": "Epipremnum aureum", // 这个需要验证

  // Aloe 属 - 芦荟属
  "1195": "Aloe vera", // 这个需要验证

  // Dracaena 属 - 龙血树属
  "1059": "Dracaena trifasciata", // 这个需要验证

  // Monstera 属 - 龟背竹属
  "1252": "Monstera deliciosa", // 这个需要验证

  // Chlorophytum 属 - 吊兰属
  "1290": "Chlorophytum comosum", // 这个需要验证

  // Spathiphyllum 属 - 白鹤芋属
  "1328": "Spathiphyllum wallisii", // 这个需要验证
  "1356420": "Nephrolepis cordifolia (L.) C. Presl",
  "1389294": "Nephrolepis cordifolia (L.) C.Presl",
  "1400478": "Nephrolepis biserrata (Sw.) Schott",
  "1401421": "Nephrolepis falcata (Cav.) C. Chr.",
  "1355920": "Pelargonium capitatum (L.) L'Hér.",
  "1355932": "Pelargonium graveolens L'Hér.",
  "1355955": "Pelargonium odoratissimum (L.) L'Hér.",
  "1355959": "Pelargonium peltatum (L.) L'Hér.",
  "1355961": "Pelargonium quercifolium (L. f.) L'Hér.",
  "1355978": "Pelargonium zonale (L.) L'Hér.",
  "1373151": "Pelargonium alchemilloides (L.) L'Hér.",
  "1373231": "Pelargonium quinquelobatum Hochst. ex A. Rich.",
  "1373259": "Pelargonium glechomoides A. Rich.",
  "1394453": "Pelargonium x hybridum (L.) Aiton",
  "1394454": "Pelargonium inquinans (L.) Aiton",
  "1394455": "Pelargonium peltatum (L.) Aiton",
  "1408468": "Pelargonium x asperum Ehrh. ex Willd.",
  "1419112": "Pelargonium crispum (P.J. Bergius) L'Hér.",
  "1419115": "Pelargonium x hortorum L.H. Bailey",
  "1421001": "Pelargonium spp.",
  "1422712": "Pelargonium grandiflorum Willd.",
  "1435709": "Pelargonium panduriforme Eckl. & Zeyh.",
  "1435714": "Pelargonium zonale (L.) L'Hér. ex Aiton",
  "1550658": "Pelargonium echinatum Curtis",
  "1550692": "Pelargonium × hortorum L.H. Bailey",
  "1550785": "Pelargonium sidoides DC.",
  "1550799": "Pelargonium tomentosum Jacq.",
  // Sedum 属 - 景天科多肉植物
  "1358094": "Sedum acre L.",
  "1358095": "Sedum album L.",
  "1358096": "Sedum amplexicaule DC.",
  "1358097": "Sedum andegavense (DC.) Desv.",
  "1358099": "Sedum brevifolium DC.",
  "1358101": "Sedum caeruleum L.",
  "1358102": "Sedum caespitosum (Cav.) DC.",
  "1358103": "Sedum cepaea L.",
  "1358105": "Sedum dasyphyllum L.",
  "1358108": "Sedum forsterianum Sm.",
  "1358112": "Sedum hirsutum All.",
  "1358119": "Sedum litoreum Guss.",
  "1358127": "Sedum multiceps Coss. & Durieu",
  "1358132": "Sedum rubens L.",
  "1358133": "Sedum sediforme (Jacq.) Pau",
  "1362192": "Sedum villosum L.",
  "1362489": "Sedum anglicum Huds.",
  "1362490": "Sedum rupestre L.",
  "1363613": "Sedum hispanicum L.",
  "1389307": "Sedum pachyphyllum Rose",
  "1389308": "Sedum dendroideum Moc. & Sessé ex DC.",
  "1396143": "Sedum sarmentosum Bunge",
  "1396144": "Sedum alpestre Vill.",
  "1396145": "Sedum annuum L.",
  "1396156": "Sedum kamtschaticum Fisch. & C.A.Mey.",
  "1396159": "Sedum mexicanum Britton",
  "1396161": "Sedum ochroleucum Chaix",
  "1396165": "Sedum sexangulare L.",
  "1397491": "Sedum atratum L.",
  "1397550": "Sedum montanum Perrier & Songeon",
  "1398128": "Sedum palmeri S.Watson",
  "1413751": "Sedum divergens S. Watson",
  "1413752": "Sedum lanceolatum Torr.",
  "1413753": "Sedum oreganum Nutt.",
  "1413755": "Sedum spathulifolium Hook.",
  "1413757": "Sedum ternatum Michx.",
  "1418545": "Sedum kamtschaticum Fisch.",
  "1418546": "Sedum lineare Thunb.",
  "1418547": "Sedum morganianum E.Walther",
  "1421021": "Sedum palmeri S. Watson",
  "1438033": "Sedum albomarginatum R.T. Clausen",
  "1438041": "Sedum glaucophyllum R.T. Clausen",
  "1438043": "Sedum laxum (Britton) A. Berger",
  "1438045": "Sedum moranense Kunth",
  "1438049": "Sedum niveum Davidson",
  "1438052": "Sedum obtusatum A. Gray",
  "1438056": "Sedum pulchellum Michx.",
  "1529081": "Sedum adolphii Raym.-Hamet",
  "1529084": "Sedum allantoides Rose",
  "1529107": "Sedum burrito Moran",
  "1529124": "Sedum clavatum R.T. Clausen",
  "1529128": "Sedum compressum Rose",
  "1529144": "Sedum cyaneum J. Rudolph",
  "1529148": "Sedum decumbens R.T. Clausen",
  "1529179": "Sedum furfuraceum Moran",
  "1529205": "Sedum hernandezii J. Meyrán",
  "1529212": "Sedum japonicum Siebold ex Miq.",
  "1529242": "Sedum makinoi Maxim.",
  "1529265": "Sedum nussbaumerianum Bitter",
  "1529305": "Sedum praealtum A.DC.",
  "1529328": "Sedum rubrotinctum R.T. Clausen",
  // Tradescantia 属 - 紫露草属
  "1356075": "Tradescantia fluminensis Vell.",
  "1356076": "Tradescantia zebrina Heynh. ex Bosse",
  "1362927": "Tradescantia pallida (Rose) D.R. Hunt",
  "1363117": "Tradescantia cerinthoides Kunth",
  "1369960": "Tradescantia spathacea Sw.",
  "1396823": "Tradescantia x andersoniana F.Ludw. & Rohweder",
  "1396824": "Tradescantia virginiana L.",
  "1398178": "Tradescantia zebrina Bosse",
  "1408774": "Tradescantia pallida (Rose) D.R.Hunt",
  "1414057": "Tradescantia occidentalis (Britton) Smyth",
  "1414058": "Tradescantia ohiensis Raf.",
  "1418475": "Tradescantia subaspera Ker Gawl.",
  "1422105": "Tradescantia zebrina hort. ex Bosse",
  "1439145": "Tradescantia crassifolia Cav.",
  "1497630": "Tradescantia × andersoniana W.Ludw. & Rohweder",
  "1497667": "Tradescantia sillamontana Matuda"
};

// 我们的植物数据库
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

// 提取学名的属名和种名
function extractGenusSpecies(scientificName) {
  const parts = scientificName.split(' ');
  if (parts.length >= 2) {
    return {
      genus: parts[0],
      species: parts[1],
      full: `${parts[0]} ${parts[1]}`
    };
  }
  return null;
}

// 分析匹配情况
function analyzeMatches() {
  const ourPlants = loadOurPlants();
  const results = {
    exactMatches: [],
    genusMatches: [],
    noMatches: [],
    plantnetStats: {
      totalSpecies: Object.keys(plantnetSpecies).length,
      genusCount: {}
    }
  };

  // 统计PlantNet中的属
  Object.values(plantnetSpecies).forEach(name => {
    const parsed = extractGenusSpecies(name);
    if (parsed) {
      results.plantnetStats.genusCount[parsed.genus] = 
        (results.plantnetStats.genusCount[parsed.genus] || 0) + 1;
    }
  });

  // 分析我们的植物
  ourPlants.forEach(plant => {
    const ourParsed = extractGenusSpecies(plant.scientific_name);
    if (!ourParsed) {
      results.noMatches.push({
        plant: plant,
        reason: '学名格式无法解析'
      });
      return;
    }

    // 查找精确匹配
    let exactMatch = null;
    for (const [id, name] of Object.entries(plantnetSpecies)) {
      const plantnetParsed = extractGenusSpecies(name);
      if (plantnetParsed && plantnetParsed.full === ourParsed.full) {
        exactMatch = { id, name, parsed: plantnetParsed };
        break;
      }
    }

    if (exactMatch) {
      results.exactMatches.push({
        plant: plant,
        plantnetMatch: exactMatch
      });
    } else {
      // 查找属级匹配
      const genusMatches = [];
      for (const [id, name] of Object.entries(plantnetSpecies)) {
        const plantnetParsed = extractGenusSpecies(name);
        if (plantnetParsed && plantnetParsed.genus === ourParsed.genus) {
          genusMatches.push({ id, name, parsed: plantnetParsed });
        }
      }

      if (genusMatches.length > 0) {
        results.genusMatches.push({
          plant: plant,
          plantnetMatches: genusMatches
        });
      } else {
        results.noMatches.push({
          plant: plant,
          reason: '无匹配'
        });
      }
    }
  });

  return results;
}

// 生成报告
function generateReport(results) {
  console.log('\n=== PlantNet-300K 植物匹配分析报告 ===\n');
  
  console.log(`PlantNet-300K 数据集统计:`);
  console.log(`- 总物种数: ${results.plantnetStats.totalSpecies}`);
  console.log(`- 涵盖属数: ${Object.keys(results.plantnetStats.genusCount).length}`);
  console.log(`- 主要属及物种数:`);
  
  const sortedGenera = Object.entries(results.plantnetStats.genusCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedGenera.forEach(([genus, count]) => {
    console.log(`  * ${genus}: ${count} 种`);
  });

  console.log(`\n我们的植物数据库匹配情况:`);
  console.log(`- 精确匹配: ${results.exactMatches.length} 种`);
  console.log(`- 属级匹配: ${results.genusMatches.length} 种`);
  console.log(`- 无匹配: ${results.noMatches.length} 种`);

  if (results.exactMatches.length > 0) {
    console.log(`\n✅ 精确匹配的植物:`);
    results.exactMatches.forEach(match => {
      console.log(`- ${match.plant.common_names.zh[0]} (${match.plant.scientific_name})`);
      console.log(`  → PlantNet ID: ${match.plantnetMatch.id}`);
      console.log(`  → PlantNet 学名: ${match.plantnetMatch.name}`);
    });
  }

  if (results.genusMatches.length > 0) {
    console.log(`\n🔍 属级匹配的植物:`);
    results.genusMatches.forEach(match => {
      console.log(`- ${match.plant.common_names.zh[0]} (${match.plant.scientific_name})`);
      console.log(`  → 同属物种数: ${match.plantnetMatches.length}`);
      console.log(`  → 代表物种: ${match.plantnetMatches.slice(0, 3).map(m => m.parsed.full).join(', ')}`);
    });
  }

  if (results.noMatches.length > 0) {
    console.log(`\n❌ 无匹配的植物:`);
    results.noMatches.forEach(match => {
      console.log(`- ${match.plant.common_names.zh[0]} (${match.plant.scientific_name}) - ${match.reason}`);
    });
  }

  // 保存详细结果到文件
  const outputPath = path.join(__dirname, 'plantnet_match_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n详细匹配结果已保存到: ${outputPath}`);
}

// 主函数
function main() {
  console.log('开始分析 PlantNet-300K 与我们植物数据库的匹配情况...');
  const results = analyzeMatches();
  generateReport(results);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeMatches, generateReport };
