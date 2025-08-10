/**
 * 植物推荐算法
 * 根据用户问卷答案推荐合适的植物
 */

class PlantRecommender {
  constructor() {
    // 各维度权重配置
    this.weights = {
      light: 1.2,  // 光照最重要
      space: 1.0,  // 空间相对灵活
      level: 1.1   // 经验水平很重要
    };
    this.baseScore = 10; // 每个维度匹配的基础分数
  }

  /**
   * 主推荐函数
   * @param {Array} answers - 用户答案 [{ id: 'light', value: 'low' }, ...]
   * @param {Array} plants - 植物数据数组
   * @param {Object} options - 配置选项 { topN: 10 }
   * @returns {Array} 推荐的植物列表，按分数降序排列
   */
  recommend(answers, plants, options = {}) {
    const { topN = 10 } = options;
    
    // 1. 过滤上架植物
    const availablePlants = plants.filter(plant => plant.onShelf);
    
    if (availablePlants.length === 0) {
      return [];
    }
    
    // 2. 计算每个植物的推荐分数
    const scoredPlants = availablePlants.map(plant => ({
      ...plant,
      score: this.calculateScore(answers, plant)
    }));
    
    // 3. 排序并返回TopN
    return scoredPlants
      .sort((a, b) => {
        // 主要按分数降序
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // 次要按更新时间降序（更新的植物优先）
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, topN);
  }

  /**
   * 计算单个植物的推荐分数
   * @param {Array} answers - 用户答案
   * @param {Object} plant - 植物对象
   * @returns {number} 推荐分数
   */
  calculateScore(answers, plant) {
    // 转换answers数组为对象便于查找
    const answerMap = {};
    answers.forEach(answer => {
      answerMap[answer.id] = answer.value;
    });
    
    let totalScore = 0;
    
    // 计算每个维度的匹配分数
    const dimensions = ['light', 'space', 'level'];
    dimensions.forEach(dimension => {
      if (this.isMatch(answerMap[dimension], plant.tags, dimension)) {
        totalScore += this.baseScore * this.weights[dimension];
      }
    });
    
    return totalScore;
  }

  /**
   * 判断用户需求与植物标签是否匹配（包含兼容性逻辑）
   * @param {string} userValue - 用户选择的值
   * @param {Array} plantTags - 植物的标签数组
   * @param {string} dimension - 维度名称
   * @returns {boolean} 是否匹配
   */
  isMatch(userValue, plantTags, dimension) {
    if (!userValue || !Array.isArray(plantTags)) {
      return false;
    }
    
    // 精确匹配
    if (plantTags.includes(userValue)) {
      return true;
    }
    
    // 兼容性匹配
    return this.isCompatible(userValue, plantTags, dimension);
  }

  /**
   * 兼容性匹配逻辑
   * @param {string} userValue - 用户选择的值
   * @param {Array} plantTags - 植物的标签数组
   * @param {string} dimension - 维度名称
   * @returns {boolean} 是否兼容
   */
  isCompatible(userValue, plantTags, dimension) {
    switch (dimension) {
      case 'light':
        // 光照兼容性：植物适应性强，可以在更好的光照条件下生长
        if (userValue === 'low' && (plantTags.includes('medium') || plantTags.includes('high'))) {
          return true;
        }
        if (userValue === 'medium' && plantTags.includes('high')) {
          return true;
        }
        break;
        
      case 'space':
        // 空间兼容性：大空间可以放小植物
        if (userValue === 'large' && (plantTags.includes('medium') || plantTags.includes('small'))) {
          return true;
        }
        if (userValue === 'medium' && plantTags.includes('small')) {
          return true;
        }
        break;
        
      case 'level':
        // 经验水平兼容性：高水平用户可以养护低难度植物
        if (userValue === 'expert' && (plantTags.includes('intermediate') || plantTags.includes('beginner'))) {
          return true;
        }
        if (userValue === 'intermediate' && plantTags.includes('beginner')) {
          return true;
        }
        break;
    }
    
    return false;
  }

  /**
   * 获取推荐解释
   * @param {Array} answers - 用户答案
   * @param {Object} plant - 植物对象
   * @returns {Object} 推荐解释
   */
  getRecommendationReason(answers, plant) {
    const answerMap = {};
    answers.forEach(answer => {
      answerMap[answer.id] = answer.value;
    });
    
    const matches = [];
    const compatibles = [];
    
    ['light', 'space', 'level'].forEach(dimension => {
      const userValue = answerMap[dimension];
      if (plant.tags.includes(userValue)) {
        matches.push(dimension);
      } else if (this.isCompatible(userValue, plant.tags, dimension)) {
        compatibles.push(dimension);
      }
    });
    
    return {
      exactMatches: matches,
      compatibleMatches: compatibles,
      score: this.calculateScore(answers, plant)
    };
  }
}

// 创建默认实例
const defaultRecommender = new PlantRecommender();

/**
 * 简化的推荐函数接口
 * @param {Array} answers - 用户答案
 * @param {Array} plants - 植物数据
 * @param {Object} options - 配置选项
 * @returns {Array} 推荐结果
 */
function recommend(answers, plants, options = {}) {
  return defaultRecommender.recommend(answers, plants, options);
}

/**
 * 获取推荐解释
 * @param {Array} answers - 用户答案
 * @param {Object} plant - 植物对象
 * @returns {Object} 推荐解释
 */
function getRecommendationReason(answers, plant) {
  return defaultRecommender.getRecommendationReason(answers, plant);
}

module.exports = {
  PlantRecommender,
  recommend,
  getRecommendationReason
};
