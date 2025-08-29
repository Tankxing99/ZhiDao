#!/bin/bash
# PlantNet 图片下载脚本
# 自动生成于 2025-08-17T14:41:19.885Z

mkdir -p images/plantnet
cd images/plantnet

echo "开始下载 PlantNet 植物图片..."


# 第一阶段：精确匹配植物图片

echo "下载 雪铁芋 (Zamioculcas zamiifolia (Lodd.) Engl.) 的图片..."
mkdir -p zamioculcas_zamiifolia
curl -L "https://bs.plantnet.org/image/o/1385937_1.jpg" -o "zamioculcas_zamiifolia/zamioculcas_zamiifolia_1.jpg" || echo "图片 1 下载失败"
curl -L "https://bs.plantnet.org/image/o/1385937_2.jpg" -o "zamioculcas_zamiifolia/zamioculcas_zamiifolia_2.jpg" || echo "图片 2 下载失败"
curl -L "https://bs.plantnet.org/image/o/1385937_3.jpg" -o "zamioculcas_zamiifolia/zamioculcas_zamiifolia_3.jpg" || echo "图片 3 下载失败"
curl -L "https://bs.plantnet.org/image/o/1385937_4.jpg" -o "zamioculcas_zamiifolia/zamioculcas_zamiifolia_4.jpg" || echo "图片 4 下载失败"
curl -L "https://bs.plantnet.org/image/o/1385937_5.jpg" -o "zamioculcas_zamiifolia/zamioculcas_zamiifolia_5.jpg" || echo "图片 5 下载失败"

echo "下载 肾蕨（波士顿蕨） (Nephrolepis exaltata (L.) Schott) 的图片..."
mkdir -p nephrolepis_exaltata
curl -L "https://bs.plantnet.org/image/o/1356421_1.jpg" -o "nephrolepis_exaltata/nephrolepis_exaltata_1.jpg" || echo "图片 1 下载失败"
curl -L "https://bs.plantnet.org/image/o/1356421_2.jpg" -o "nephrolepis_exaltata/nephrolepis_exaltata_2.jpg" || echo "图片 2 下载失败"
curl -L "https://bs.plantnet.org/image/o/1356421_3.jpg" -o "nephrolepis_exaltata/nephrolepis_exaltata_3.jpg" || echo "图片 3 下载失败"
curl -L "https://bs.plantnet.org/image/o/1356421_4.jpg" -o "nephrolepis_exaltata/nephrolepis_exaltata_4.jpg" || echo "图片 4 下载失败"
curl -L "https://bs.plantnet.org/image/o/1356421_5.jpg" -o "nephrolepis_exaltata/nephrolepis_exaltata_5.jpg" || echo "图片 5 下载失败"

echo "下载 红掌 (Anthurium andraeanum Linden ex André) 的图片..."
mkdir -p anthurium_andraeanum
curl -L "https://bs.plantnet.org/image/o/1409238_1.jpg" -o "anthurium_andraeanum/anthurium_andraeanum_1.jpg" || echo "图片 1 下载失败"
curl -L "https://bs.plantnet.org/image/o/1409238_2.jpg" -o "anthurium_andraeanum/anthurium_andraeanum_2.jpg" || echo "图片 2 下载失败"
curl -L "https://bs.plantnet.org/image/o/1409238_3.jpg" -o "anthurium_andraeanum/anthurium_andraeanum_3.jpg" || echo "图片 3 下载失败"
curl -L "https://bs.plantnet.org/image/o/1409238_4.jpg" -o "anthurium_andraeanum/anthurium_andraeanum_4.jpg" || echo "图片 4 下载失败"
curl -L "https://bs.plantnet.org/image/o/1409238_5.jpg" -o "anthurium_andraeanum/anthurium_andraeanum_5.jpg" || echo "图片 5 下载失败"

echo "图片下载完成！"
echo "请检查 images/plantnet 目录中的图片文件"
