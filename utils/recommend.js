/**
 * 增强版植物推荐算法
 * 支持多维度权重优化、动态权重调节、负向过滤机制
 * 基于用户画像提供个性化植物推荐
 */

class PlantRecommender {
  constructor() {
    // 基础权重配置（可动态调整）
    this.baseWeights = {
      environment: 0.4,  // 环境适配度
      aesthetic: 0.3,    // 审美偏好
      care: 0.2,         // 养护能力
      safety: 0.1        // 安全因素
    };

    // 细分维度权重
    this.dimensionWeights = {
      // 环境适配度子维度
      light: 0.5,
      space: 0.3,
      climate: 0.2,

      // 审美偏好子维度
      shape: 0.6,
      color: 0.4,

      // 养护能力子维度
      level: 0.7,
      time: 0.3,

      // 安全因素子维度
      petSafe: 1.0,
      allergyFree: 1.0
    };

    this.baseScore = 10;
  }

  /**
   * 动态权重调节
   * 根据用户画像调整权重配置
   * @param {Object} userProfile - 用户画像
   * @returns {Object} 调整后的权重
   */
  adjustWeights(userProfile) {
    const weights = { ...this.baseWeights };

    // 新用户策略：提升环境权重
    if (userProfile.isNewUser || userProfile.experienceLevel === 'beginner') {
      weights.environment = 0.6;
      weights.aesthetic = 0.2;
      weights.care = 0.15;
      weights.safety = 0.05;
    }

    // 有宠物用户：安全优先
    if (userProfile.hasPets) {
      weights.safety = 0.3;
      weights.environment = 0.35;
      weights.aesthetic = 0.2;
      weights.care = 0.15;
    }

    // 高经验用户：审美偏好优先
    if (userProfile.experienceLevel === 'expert') {
      weights.aesthetic = 0.4;
      weights.environment = 0.3;
      weights.care = 0.2;
      weights.safety = 0.1;
    }

    // 审美重要用户
    if (userProfile.aestheticImportant) {
      weights.aesthetic = 0.4;
      weights.environment = 0.3;
    }

    return weights;
  }

  /**
   * 负向过滤机制
   * 根据用户画像过滤不合适的植物
   * @param {Array} plants - 植物列表
   * @param {Object} userProfile - 用户画像
   * @returns {Array} 过滤后的植物列表
   */
  applyNegativeFilters(plants, userProfile) {
    return plants.filter(plant => {
      const safetyFlags = plant.safetyFlags || [];

      // 宠物安全过滤
      if (userProfile.hasPets) {
        if (userProfile.petTypes) {
          for (const petType of userProfile.petTypes) {
            if (safetyFlags.includes(`toxic-to-${petType}s`)) {
              return false;
            }
          }
        }
        // 通用宠物毒性过滤
        if (safetyFlags.includes('pet_unsafe') || safetyFlags.includes('toxic-to-cats') || safetyFlags.includes('toxic-to-dogs')) {
          return false;
        }
      }

      // 儿童安全过滤
      if (userProfile.hasChildren) {
        if (safetyFlags.includes('child_unsafe') || safetyFlags.includes('toxic-if-ingested') || safetyFlags.includes('sharp-spines')) {
          return false;
        }
      }

      // 过敏源过滤
      if (userProfile.allergies) {
        for (const allergy of userProfile.allergies) {
          if (safetyFlags.includes(allergy)) {
            return false;
          }
        }
      }

      // 新手难度过滤
      if (userProfile.experienceLevel === 'beginner' && plant.tags && plant.tags.includes('expert-only')) {
        return false;
      }

      return true;
    });
  }

  /**
   * 增强版推荐函数
   * @param {Array} answers - 用户答案
   * @param {Array} plants - 植物数据数组
   * @param {Object} options - 配置选项 { topN: 10, userProfile: {} }
   * @returns {Array} 推荐的植物列表，按分数降序排列
   */
  recommend(answers, plants, options = {}) {
    const { topN = 10, userProfile = {} } = options;

    // 1. 过滤上架植物
    let availablePlants = plants.filter(plant => plant.onShelf);

    // 2. 应用负向过滤
    availablePlants = this.applyNegativeFilters(availablePlants, userProfile);

    if (availablePlants.length === 0) {
      return [];
    }

    // 3. 计算评分
    const scoredPlants = availablePlants.map(plant => ({
      ...plant,
      score: this.calculateScore(answers, plant, userProfile)
    }));

    // 4. 排序并返回
    return scoredPlants
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, topN);
  }

  /**
   * 增强版评分算法
   * @param {Array} answers - 用户答案
   * @param {Object} plant - 植物对象
   * @param {Object} userProfile - 用户画像
   * @returns {number} 推荐分数
   */
  calculateScore(answers, plant, userProfile = {}) {
    const answerMap = {};
    answers.forEach(answer => {
      answerMap[answer.id] = answer.value;
    });

    // 获取动态权重
    const weights = this.adjustWeights(userProfile);
    let totalScore = 0;

    // 环境适配度评分
    const envScore = this.calculateEnvironmentScore(answerMap, plant);
    totalScore += envScore * weights.environment;

    // 审美偏好评分
    const aestheticScore = this.calculateAestheticScore(answerMap, plant);
    totalScore += aestheticScore * weights.aesthetic;

    // 养护能力评分
    const careScore = this.calculateCareScore(answerMap, plant);
    totalScore += careScore * weights.care;

    // 安全因素评分
    const safetyScore = this.calculateSafetyScore(answerMap, plant, userProfile);
    totalScore += safetyScore * weights.safety;

    return Math.round(totalScore * 100) / 100;
  }

  /**
   * 计算环境适配度评分
   */
  calculateEnvironmentScore(answerMap, plant) {
    let score = 0;
    const maxScore = this.baseScore;

    // 光照匹配
    if (this.isMatch(answerMap.lightCondition || answerMap.light, plant.tags, 'light')) {
      score += maxScore * this.dimensionWeights.light;
    }

    // 空间匹配
    if (this.isMatch(answerMap.spaceType || answerMap.space, plant.tags, 'space')) {
      score += maxScore * this.dimensionWeights.space;
    }

    return score;
  }

  /**
   * 计算审美偏好评分
   */
  calculateAestheticScore(answerMap, plant) {
    let score = 0;
    const maxScore = this.baseScore;

    // 植物形态匹配
    if (answerMap.plantShape && this.isMatch(answerMap.plantShape, plant.tags, 'shape')) {
      score += maxScore * this.dimensionWeights.shape;
    }

    // 色彩偏好匹配
    if (answerMap.colorPreference && this.isMatch(answerMap.colorPreference, plant.tags, 'color')) {
      score += maxScore * this.dimensionWeights.color;
    }

    return score;
  }

  /**
   * 计算养护能力评分
   */
  calculateCareScore(answerMap, plant) {
    let score = 0;
    const maxScore = this.baseScore;

    // 经验水平匹配
    if (this.isMatch(answerMap.experienceLevel || answerMap.level, plant.tags, 'level')) {
      score += maxScore * this.dimensionWeights.level;
    }

    // 时间投入匹配
    if (answerMap.timeCommitment && this.isMatch(answerMap.timeCommitment, plant.tags, 'time')) {
      score += maxScore * this.dimensionWeights.time;
    }

    return score;
  }

  /**
   * 计算安全因素评分
   */
  calculateSafetyScore(answerMap, plant, userProfile) {
    let score = this.baseScore;
    const safetyFlags = plant.safetyFlags || [];

    // 如果用户有宠物但植物对宠物有毒，分数为0
    if (userProfile.hasPets && safetyFlags.includes('pet_unsafe')) {
      return 0;
    }

    // 如果用户有儿童但植物对儿童不安全，分数为0
    if (userProfile.hasChildren && safetyFlags.includes('child_unsafe')) {
      return 0;
    }

    return score;
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
    const ans = Array.isArray(answers) ? answers : [];
    const answerMap = {};
    ans.forEach(answer => {
      if (answer && typeof answer.id === 'string') {
        answerMap[answer.id] = answer.value;
      }
    });
    const tags = Array.isArray(plant && plant.tags) ? plant.tags : [];

    const matches = [];
    const compatibles = [];

    ['light', 'space', 'level'].forEach(dimension => {
      const userValue = answerMap[dimension];
      if (tags.includes(userValue)) {
        matches.push(dimension);
      } else if (this.isCompatible(userValue, tags, dimension)) {
        compatibles.push(dimension);
      }
    });

    return {
      exactMatches: matches,
      compatibleMatches: compatibles,
      score: this.calculateScore(ans, plant)
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
