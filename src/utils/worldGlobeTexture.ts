import * as THREE from 'three';

/**
 * High-detail geographic coastline polygons [longitude, latitude][]
 * Covering North/Central/South America, Caribbean, Europe, UK, Iceland, Africa, Madagascar,
 * Middle East, India, Russia/Asia, Japan, Indonesia, Australia, New Zealand.
 */
export const WORLD_LAND_POLYGONS: Array<Array<[number, number]>> = [
  // North America & Central America (Detailed coastline)
  [
    [-168, 65.5], [-161, 70.2], [-148, 70.5], [-136, 69.2], [-126, 70.2],
    [-112, 71.5], [-96, 71.2], [-84, 69.5], [-79, 63.0], [-82, 55.0],
    [-78, 58.5], [-72, 61.5], [-64, 60.0], [-56, 52.5], [-60, 46.5],
    [-64, 45.0], [-67, 44.8], [-70, 43.2], [-70, 41.5], [-74, 40.5],
    [-75.5, 38.0], [-75.5, 35.2], [-79, 33.0], [-81, 31.0], [-80.2, 25.5],
    [-81.8, 25.2], [-82.8, 28.0], [-84.5, 29.8], [-89.2, 29.2], [-94.5, 29.5],
    [-97.2, 26.0], [-97.5, 22.0], [-96.0, 19.2], [-92.0, 18.5], [-90.2, 21.2],
    [-87.0, 21.4], [-88.2, 17.5], [-86.0, 16.0], [-83.2, 14.8], [-83.5, 10.5],
    [-82.0, 9.0], [-79.5, 9.2], [-77.5, 8.2], [-78.2, 7.2], [-80.5, 7.5],
    [-83.0, 8.5], [-85.8, 11.0], [-87.8, 13.2], [-92.2, 14.5], [-95.0, 16.2],
    [-99.8, 16.8], [-105.5, 20.5], [-106.5, 23.5], [-109.5, 25.8], [-112.5, 29.5],
    [-114.5, 31.5], [-110.0, 23.0], [-112.0, 25.0], [-115.2, 29.0], [-117.2, 32.5],
    [-120.5, 34.5], [-122.4, 37.8], [-124.2, 40.5], [-124.0, 46.2], [-124.6, 48.4],
    [-128.0, 51.0], [-131.0, 54.5], [-136.0, 57.5], [-141.0, 60.0], [-147.0, 60.8],
    [-151.5, 59.5], [-158.0, 56.5], [-162.5, 55.0], [-165.5, 59.5], [-166.0, 62.5],
  ],
  // Canadian Arctic Islands (Baffin, Victoria, Ellesmere)
  [
    [-86, 73.5], [-74, 74.0], [-65, 66.5], [-62, 64.0], [-70, 62.5], [-78, 66.5], [-85, 70.0],
  ],
  [
    [-118, 73.0], [-102, 73.5], [-100, 69.5], [-115, 69.0],
  ],
  [
    [-88, 76.5], [-72, 78.5], [-64, 82.0], [-82, 81.5], [-92, 78.5],
  ],
  // Greenland
  [
    [-51, 60.2], [-43, 60.0], [-36, 65.5], [-24, 70.5], [-19, 76.5],
    [-18, 81.5], [-34, 83.2], [-52, 82.2], [-66, 79.0], [-71, 76.5],
    [-58, 74.0], [-54, 68.5], [-52, 64.0],
  ],
  // Caribbean (Cuba, Hispaniola, Puerto Rico, Jamaica)
  [
    [-84.8, 21.8], [-82.0, 23.1], [-77.5, 21.8], [-74.2, 20.1], [-77.0, 19.8], [-82.5, 21.5],
  ],
  [
    [-74.4, 18.3], [-71.5, 19.8], [-68.4, 18.5], [-71.8, 17.8],
  ],
  // South America (Detailed perimeter matching reference perspective)
  [
    [-77.2, 8.5], [-75.5, 10.5], [-73.0, 11.8], [-70.2, 11.5], [-67.0, 10.5],
    [-62.0, 10.4], [-59.5, 8.2], [-56.0, 6.0], [-52.0, 4.5], [-50.0, 1.5],
    [-48.0, -1.2], [-44.0, -2.5], [-39.0, -3.5], [-35.2, -5.8], [-34.8, -8.2],
    [-37.0, -11.0], [-38.5, -13.0], [-39.0, -16.5], [-40.2, -20.5], [-41.8, -22.8],
    [-44.5, -23.4], [-48.2, -26.2], [-50.2, -30.2], [-53.5, -33.8], [-56.5, -35.2],
    [-58.0, -38.2], [-62.2, -39.5], [-64.8, -41.5], [-65.5, -45.0], [-67.5, -48.5],
    [-68.8, -52.2], [-66.5, -54.8], [-70.5, -55.2], [-74.2, -52.5], [-75.2, -47.5],
    [-73.8, -42.0], [-73.2, -37.0], [-71.6, -33.0], [-71.4, -28.0], [-70.5, -23.0],
    [-70.2, -18.4], [-73.5, -16.2], [-76.5, -13.5], [-78.5, -10.0], [-81.2, -4.8],
    [-80.0, -2.5], [-80.8, -0.5], [-79.2, 1.8], [-77.5, 4.5], [-77.8, 7.2],
  ],
  // Iceland
  [
    [-24.2, 64.0], [-19.5, 63.4], [-14.0, 64.4], [-13.8, 66.2], [-18.5, 66.5], [-23.5, 66.0],
  ],
  // Great Britain & Ireland
  [
    [-5.5, 50.1], [-1.2, 50.7], [1.4, 51.3], [1.7, 52.6], [0.1, 53.5],
    [-1.5, 55.2], [-2.0, 57.5], [-3.5, 58.6], [-5.2, 58.4], [-5.6, 56.5],
    [-4.8, 54.8], [-3.2, 53.4], [-4.8, 52.8], [-5.2, 51.6],
  ],
  [
    [-10.2, 51.6], [-6.2, 52.2], [-5.5, 54.5], [-7.5, 55.3], [-10.0, 53.8],
  ],
  // Mainland Europe (Iberia, France, Benelux, Germany, Italy, Balkans, Eastern Europe)
  [
    [-9.2, 37.0], [-9.4, 39.0], [-8.8, 42.2], [-9.2, 43.2], [-5.0, 43.5],
    [-1.6, 43.4], [-1.2, 45.8], [-2.8, 47.5], [-4.6, 48.4], [-1.6, 49.6],
    [1.8, 51.0], [4.2, 52.0], [5.2, 53.2], [8.5, 53.8], [8.2, 55.5],
    [9.8, 57.4], [10.6, 56.2], [10.2, 54.4], [12.2, 54.2], [14.5, 54.0],
    [18.8, 54.5], [21.0, 55.8], [22.2, 57.6], [24.5, 59.4], [28.0, 60.0],
    [30.2, 60.2], [35.0, 64.5], [42.0, 66.5], [52.0, 68.2], [60.0, 68.5],
    [60.0, 50.0], [48.0, 46.2], [40.0, 44.2], [37.5, 45.0], [34.0, 45.2],
    [30.5, 46.2], [28.8, 44.0], [27.8, 42.0], [26.2, 40.5], [24.0, 40.2],
    [23.8, 38.0], [22.5, 36.8], [21.2, 37.8], [20.0, 39.8], [19.4, 41.8],
    [17.0, 43.2], [14.5, 45.4], [12.4, 45.4], [13.8, 43.5], [16.2, 41.8],
    [18.4, 40.2], [16.5, 39.0], [15.6, 38.0], [15.8, 40.0], [13.5, 41.2],
    [11.8, 42.0], [10.2, 43.8], [8.8, 44.4], [7.2, 43.7], [5.2, 43.3],
    [3.2, 42.5], [2.2, 41.4], [0.5, 40.5], [-0.4, 39.4], [-0.8, 37.6],
    [-2.5, 36.8], [-5.4, 36.0], [-7.0, 37.1],
  ],
  // Scandinavia
  [
    [5.2, 59.0], [5.0, 61.5], [6.5, 63.0], [10.5, 65.0], [14.5, 67.5],
    [18.5, 69.5], [23.5, 70.8], [28.2, 71.0], [31.0, 69.6], [29.0, 67.0],
    [25.5, 65.8], [23.5, 64.0], [21.2, 62.0], [21.5, 60.5], [24.0, 60.0],
    [27.5, 60.5], [22.0, 60.2], [19.8, 63.0], [17.5, 61.5], [18.4, 59.2],
    [16.5, 56.8], [14.2, 55.4], [12.8, 55.6], [12.0, 57.6], [10.8, 59.8],
    [8.2, 58.1], [6.2, 58.2],
  ],
  // Africa
  [
    [-5.8, 35.8], [-1.0, 35.8], [3.5, 36.8], [8.5, 37.0], [10.8, 37.1],
    [11.0, 35.0], [11.5, 33.2], [15.5, 31.5], [20.0, 32.5], [25.0, 31.8],
    [30.0, 31.2], [32.5, 31.2], [33.8, 28.0], [35.5, 24.0], [37.2, 21.0],
    [39.0, 17.0], [41.5, 14.5], [43.2, 12.2], [47.5, 11.2], [51.2, 11.8],
    [50.0, 8.5], [46.5, 4.0], [42.0, 0.0], [40.2, -4.5], [39.5, -10.0],
    [40.6, -15.0], [37.0, -18.5], [35.0, -21.5], [35.4, -24.5], [32.8, -26.5],
    [31.0, -29.8], [28.0, -32.8], [25.5, -34.0], [20.0, -34.8], [18.4, -34.0],
    [17.8, -30.5], [15.2, -26.0], [14.4, -22.5], [12.2, -17.0], [13.2, -12.5],
    [12.4, -6.0], [9.4, -1.0], [9.6, 3.8], [6.0, 4.5], [2.5, 6.2],
    [-1.5, 5.0], [-5.0, 5.2], [-8.2, 4.8], [-11.5, 6.8], [-13.6, 9.5],
    [-16.5, 12.2], [-17.4, 14.8], [-16.2, 19.0], [-17.0, 21.0], [-14.8, 24.5],
    [-13.0, 27.8], [-10.2, 30.0], [-8.5, 33.2],
  ],
  // Madagascar
  [
    [44.2, -25.2], [47.0, -25.0], [48.5, -20.5], [50.2, -15.2], [49.2, -12.2],
    [47.5, -14.5], [44.5, -17.5], [43.5, -22.0],
  ],
  // Eurasia, Middle East, India, Southeast Asia, China, Siberia
  [
    [27.0, 40.5], [26.2, 38.5], [27.5, 36.8], [32.5, 36.2], [35.8, 36.0],
    [35.2, 33.0], [34.5, 31.2], [35.0, 29.2], [37.0, 26.0], [39.2, 21.5],
    [41.5, 17.5], [43.5, 12.8], [48.0, 14.2], [53.5, 16.8], [57.8, 19.8],
    [59.5, 22.5], [56.2, 24.5], [54.5, 24.2], [51.2, 24.5], [50.0, 26.8],
    [48.5, 29.8], [50.8, 29.0], [54.0, 26.8], [57.0, 25.8], [61.5, 25.2],
    [66.8, 24.8], [68.8, 22.5], [70.2, 20.8], [72.6, 21.5], [72.8, 19.0],
    [73.8, 15.5], [75.5, 11.8], [77.5, 8.1], [79.8, 10.2], [80.2, 13.2],
    [82.5, 16.8], [85.8, 19.8], [88.2, 21.8], [91.5, 22.2], [92.2, 20.0],
    [94.2, 16.2], [96.5, 16.5], [98.2, 13.5], [99.2, 8.5], [100.5, 5.2],
    [103.5, 1.4], [104.2, 3.8], [103.2, 6.2], [100.5, 9.5], [100.2, 13.4],
    [102.5, 12.5], [104.8, 10.2], [106.5, 8.8], [109.2, 12.2], [108.5, 15.8],
    [106.5, 18.5], [107.0, 21.2], [110.2, 21.4], [114.2, 22.4], [117.2, 23.5],
    [119.5, 25.8], [121.5, 28.5], [122.0, 31.2], [120.5, 34.2], [122.4, 37.0],
    [119.5, 38.5], [121.5, 40.2], [124.2, 39.8], [126.2, 37.5], [126.5, 34.5],
    [129.0, 35.2], [129.5, 38.5], [131.0, 42.5], [135.5, 44.5], [140.2, 48.5],
    [141.2, 53.2], [137.0, 54.5], [139.0, 57.5], [145.0, 59.5], [151.0, 59.5],
    [156.0, 58.0], [156.2, 51.2], [160.5, 53.5], [163.2, 59.5], [170.5, 60.5],
    [178.0, 62.8], [178.5, 66.5], [170.0, 69.2], [155.0, 71.0], [140.0, 72.8],
    [126.0, 73.2], [112.0, 74.0], [102.0, 76.5], [88.0, 75.0], [74.0, 72.5],
    [68.0, 70.5], [60.0, 68.5], [60.0, 42.0], [54.0, 38.0], [48.5, 40.0],
    [41.5, 41.5], [36.0, 41.5], [31.0, 41.2],
  ],
  // Sri Lanka
  [
    [79.8, 6.0], [81.8, 6.8], [81.2, 8.8], [80.0, 9.6], [79.7, 7.8],
  ],
  // Japan
  [
    [130.2, 31.2], [131.8, 33.2], [134.5, 33.8], [136.8, 34.5], [139.8, 35.4],
    [140.8, 36.8], [141.8, 39.5], [140.8, 41.4], [139.5, 40.2], [137.2, 37.2],
    [135.2, 35.6], [131.0, 34.2],
  ],
  [
    [140.2, 41.8], [143.5, 42.2], [145.4, 43.4], [144.2, 44.2], [141.8, 45.4], [140.4, 43.2],
  ],
  // Taiwan & Philippines
  [
    [120.2, 22.0], [121.6, 23.5], [121.9, 25.1], [120.8, 24.5],
  ],
  [
    [120.2, 14.5], [120.0, 18.2], [122.2, 18.2], [122.5, 15.0], [124.2, 13.0],
    [125.8, 10.5], [126.4, 7.2], [124.5, 6.0], [122.0, 7.0], [121.2, 12.5],
  ],
  // Indonesia (Sumatra, Java, Borneo, Sulawesi)
  [
    [95.4, 5.5], [98.5, 4.0], [102.0, 1.5], [104.8, -1.5], [105.8, -5.8],
    [103.5, -5.0], [100.2, -1.5], [97.5, 2.0],
  ],
  [
    [105.5, -6.2], [110.0, -6.6], [114.4, -7.8], [114.0, -8.6], [109.0, -7.8], [106.0, -7.0],
  ],
  [
    [109.2, 1.2], [112.0, 3.2], [115.5, 5.5], [117.8, 6.2], [118.8, 4.5],
    [117.5, 1.0], [116.2, -3.5], [113.5, -3.5], [110.2, -2.5], [109.0, -0.5],
  ],
  [
    [119.2, 1.0], [124.8, 1.4], [122.5, -0.5], [123.0, -4.5], [120.2, -5.2], [119.0, -2.5],
  ],
  // New Guinea
  [
    [131.5, -1.5], [136.0, -2.2], [141.0, -2.8], [145.5, -4.5], [148.5, -8.0],
    [150.5, -10.2], [147.0, -9.8], [143.2, -8.2], [138.5, -8.2], [137.0, -5.0], [133.0, -4.0],
  ],
  // Australia & Tasmania
  [
    [114.0, -22.0], [118.5, -20.0], [122.5, -17.0], [126.5, -14.0], [130.8, -12.2],
    [136.5, -12.0], [136.0, -14.8], [139.2, -17.2], [141.5, -12.5], [142.5, -10.8],
    [145.4, -15.5], [149.0, -20.5], [153.2, -25.8], [153.5, -28.5], [151.2, -33.8],
    [150.0, -37.2], [146.5, -38.8], [142.0, -38.4], [138.5, -35.5], [135.5, -34.8],
    [131.5, -31.8], [125.0, -33.2], [121.5, -34.0], [117.5, -35.0], [115.0, -34.2],
    [114.2, -28.0], [113.4, -25.0],
  ],
  [
    [145.0, -40.8], [148.2, -41.0], [147.5, -43.4], [145.5, -43.0],
  ],
  // New Zealand
  [
    [172.8, -34.5], [175.5, -36.8], [178.4, -37.8], [176.8, -40.2], [174.8, -41.4],
    [173.8, -39.2], [174.2, -36.5],
  ],
  [
    [172.8, -40.8], [174.2, -41.8], [171.2, -44.2], [168.2, -46.5], [166.5, -45.8], [170.0, -43.0],
  ],
];

/**
 * Major world urban & coastal night-light clusters [lon, lat, intensity/radius]
 * Produces the glowing golden-white & ice-blue city lights web seen in the reference globe.
 */
const NIGHT_CITY_CLUSTERS: Array<[number, number, number]> = [
  // South America (prominent in reference photo!)
  [-46.63, -23.55, 1.4], [-43.17, -22.9, 1.3], [-44.0, -19.9, 1.0], [-49.27, -25.42, 1.0],
  [-51.22, -30.03, 1.1], [-38.5, -12.97, 1.1], [-34.88, -8.05, 1.1], [-38.52, -3.73, 1.0],
  [-47.92, -15.78, 1.0], [-48.49, -1.45, 0.9], [-60.02, -3.11, 0.9], [-58.38, -34.6, 1.4],
  [-64.18, -31.42, 1.0], [-60.65, -32.95, 0.95], [-56.16, -34.9, 1.0], [-70.66, -33.44, 1.2],
  [-77.04, -12.04, 1.2], [-79.88, -2.18, 0.95], [-78.46, -0.18, 0.95], [-74.07, 4.71, 1.25],
  [-75.56, 6.24, 1.0], [-74.8, 10.96, 0.95], [-66.9, 10.48, 1.1], [-71.6, 10.65, 0.9],
  [-63.18, -17.78, 0.85], [-57.57, -25.26, 0.9],
  // North & Central America
  [-74.0, 40.71, 1.5], [-71.05, 42.36, 1.2], [-75.16, 39.95, 1.15], [-77.03, 38.9, 1.2],
  [-80.19, 25.76, 1.2], [-81.37, 28.53, 1.0], [-84.38, 33.74, 1.2], [-87.62, 41.87, 1.35],
  [-83.04, 42.33, 1.1], [-79.38, 43.65, 1.25], [-73.56, 45.5, 1.15], [-95.36, 29.76, 1.25],
  [-96.79, 32.77, 1.25], [-90.07, 29.95, 1.0], [-104.99, 39.73, 1.0], [-112.07, 33.44, 1.1],
  [-118.24, 34.05, 1.45], [-117.16, 32.71, 1.1], [-122.41, 37.77, 1.3], [-122.33, 47.6, 1.15],
  [-123.12, 49.28, 1.1], [-99.13, 19.43, 1.45], [-103.34, 20.65, 1.1], [-100.31, 25.68, 1.1],
  [-90.5, 14.63, 0.95], [-79.51, 8.98, 0.95], [-82.36, 23.11, 0.95], [-69.93, 18.48, 0.9],
  // Europe
  [-0.12, 51.5, 1.45], [-2.24, 53.48, 1.1], [-6.26, 53.34, 1.0], [2.35, 48.85, 1.4],
  [4.83, 45.76, 1.0], [5.36, 43.29, 1.0], [-3.7, 40.41, 1.25], [2.17, 41.38, 1.2],
  [-9.13, 38.72, 1.1], [4.9, 52.36, 1.3], [4.35, 50.85, 1.15], [8.68, 50.11, 1.3],
  [6.96, 50.93, 1.15], [9.99, 53.55, 1.1], [13.4, 52.52, 1.3], [11.58, 48.13, 1.15],
  [8.54, 47.37, 1.2], [6.14, 46.2, 1.0], [9.19, 45.46, 1.25], [12.49, 41.9, 1.25],
  [14.26, 40.85, 1.0], [16.37, 48.2, 1.15], [14.43, 50.07, 1.1], [21.01, 52.22, 1.2],
  [19.04, 47.49, 1.1], [26.1, 44.42, 1.0], [23.72, 37.98, 1.1], [28.97, 41.0, 1.35],
  [18.06, 59.32, 1.15], [12.56, 55.67, 1.05], [10.75, 59.91, 1.0], [24.93, 60.16, 1.0],
  [37.61, 55.75, 1.4], [30.33, 59.93, 1.2], [30.52, 50.45, 1.15], [-21.94, 64.14, 0.9],
  // Africa & Middle East
  [31.23, 30.04, 1.4], [29.91, 31.2, 1.1], [-7.58, 33.57, 1.1], [3.05, 36.75, 1.0],
  [10.18, 36.8, 0.95], [3.37, 6.52, 1.3], [-0.18, 5.6, 1.0], [-17.46, 14.71, 0.95],
  [36.82, -1.29, 1.1], [32.55, 15.5, 0.9], [38.75, 9.03, 0.95], [28.04, -26.2, 1.3],
  [18.42, -33.92, 1.15], [31.02, -29.85, 1.0], [34.78, 32.08, 1.1], [35.91, 31.95, 0.95],
  [44.36, 33.31, 1.1], [51.38, 35.68, 1.25], [46.67, 24.71, 1.15], [55.27, 25.2, 1.25],
  // India & Asia-Pacific
  [72.87, 19.07, 1.45], [77.2, 28.61, 1.45], [77.59, 12.97, 1.3], [80.27, 13.08, 1.2],
  [78.48, 17.38, 1.2], [88.36, 22.57, 1.3], [72.57, 23.02, 1.1], [67.0, 24.86, 1.2],
  [74.35, 31.52, 1.15], [90.41, 23.81, 1.2], [100.5, 13.75, 1.3], [103.81, 1.35, 1.35],
  [101.68, 3.13, 1.2], [106.84, -6.2, 1.35], [112.75, -7.25, 1.1], [106.62, 10.82, 1.2],
  [105.83, 21.02, 1.1], [120.98, 14.59, 1.25], [114.16, 22.31, 1.4], [113.26, 23.12, 1.3],
  [121.47, 31.23, 1.5], [116.4, 39.9, 1.45], [104.06, 30.57, 1.15], [114.3, 30.59, 1.15],
  [121.56, 25.03, 1.25], [126.97, 37.56, 1.4], [129.07, 35.17, 1.15], [139.65, 35.67, 1.5],
  [135.5, 34.69, 1.3], [136.9, 35.18, 1.15], [151.2, -33.86, 1.3], [144.96, -37.81, 1.25],
  [153.02, -27.46, 1.1], [115.86, -31.95, 1.05], [174.76, -36.84, 1.0],
];

function lonLatToUv(lon: number, lat: number, width: number, height: number): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export interface ProceduralGlobeMaps {
  colorMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Deterministic pseudo-random generator so city light constellations stay stable across renders.
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Evaluates a smooth multi-basin oceanic scalar field so we can trace organic concentric
 * topographical / bathymetric contour rings over the oceans exactly like the reference image.
 */
function evaluateOceanicContourField(lon: number, lat: number): number {
  const radLon = (lon * Math.PI) / 180;
  const radLat = (lat * Math.PI) / 180;

  // Spherical harmonic waves + localized oceanic basin centers (North/South Atlantic, Pacific, Indian)
  const basins = [
    { lon: -32, lat: 24, weight: 1.35, spread: 28 },
    { lon: -24, lat: -26, weight: 1.4, spread: 26 },
    { lon: -115, lat: -12, weight: 1.25, spread: 34 },
    { lon: -145, lat: 28, weight: 1.2, spread: 32 },
    { lon: 78, lat: -22, weight: 1.35, spread: 28 },
    { lon: 155, lat: 18, weight: 1.2, spread: 30 },
    { lon: 10, lat: -52, weight: 1.15, spread: 25 },
  ];

  let val =
    0.35 * Math.sin(radLon * 3.0 + 0.6) * Math.cos(radLat * 2.5) +
    0.25 * Math.cos(radLon * 5.0 - radLat * 3.0);

  for (const b of basins) {
    const dLon = lon - b.lon;
    const dLat = lat - b.lat;
    const distSq = (dLon * dLon) / (b.spread * b.spread * 1.6) + (dLat * dLat) / (b.spread * b.spread);
    val += b.weight * Math.exp(-distSq);
  }

  return val;
}

/**
 * Draws organic concentric bathymetric contour lines across the ocean canvas using a fast
 * threshold-crossing grid pass.
 */
function drawOceanicTopographicContours(
  ctx: CanvasRenderingContext2D,
  eCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isSoftwareGl: boolean,
  isDaylight: boolean
) {
  const cols = isSoftwareGl ? 180 : 320;
  const rows = isSoftwareGl ? 90 : 160;
  const field = new Float32Array((cols + 1) * (rows + 1));

  for (let r = 0; r <= rows; r++) {
    const lat = 90 - (r / rows) * 180;
    for (let c = 0; c <= cols; c++) {
      const lon = -180 + (c / cols) * 360;
      field[r * (cols + 1) + c] = evaluateOceanicContourField(lon, lat);
    }
  }

  const levels = [0.22, 0.36, 0.5, 0.64, 0.78, 0.92, 1.06, 1.2, 1.34];
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.save();
  eCtx.save();

  levels.forEach((iso, idx) => {
    const isMajor = idx % 2 === 0;
    ctx.strokeStyle = isDaylight
      ? isMajor
        ? 'rgba(110, 195, 255, 0.52)'
        : 'rgba(75, 160, 235, 0.34)'
      : isMajor
      ? 'rgba(82, 178, 255, 0.62)'
      : 'rgba(52, 132, 215, 0.36)';
    ctx.lineWidth = isMajor ? (isSoftwareGl ? 1.1 : 1.7) : isSoftwareGl ? 0.75 : 1.1;

    eCtx.strokeStyle = isMajor ? 'rgba(65, 158, 245, 0.42)' : 'rgba(38, 105, 185, 0.22)';
    eCtx.lineWidth = ctx.lineWidth;

    ctx.beginPath();
    eCtx.beginPath();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i00 = field[r * (cols + 1) + c];
        const i10 = field[r * (cols + 1) + (c + 1)];
        const i01 = field[(r + 1) * (cols + 1) + c];
        const i11 = field[(r + 1) * (cols + 1) + (c + 1)];

        const x = c * cellW;
        const y = r * cellH;

        const pts: Array<[number, number]> = [];
        if ((i00 < iso) !== (i10 < iso)) {
          const t = (iso - i00) / (i10 - i00 || 1e-5);
          pts.push([x + t * cellW, y]);
        }
        if ((i10 < iso) !== (i11 < iso)) {
          const t = (iso - i10) / (i11 - i10 || 1e-5);
          pts.push([x + cellW, y + t * cellH]);
        }
        if ((i01 < iso) !== (i11 < iso)) {
          const t = (iso - i01) / (i11 - i01 || 1e-5);
          pts.push([x + t * cellW, y + cellH]);
        }
        if ((i00 < iso) !== (i01 < iso)) {
          const t = (iso - i00) / (i01 - i00 || 1e-5);
          pts.push([x, y + t * cellH]);
        }

        if (pts.length >= 2) {
          ctx.moveTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          eCtx.moveTo(pts[0][0], pts[0][1]);
          eCtx.lineTo(pts[1][0], pts[1][1]);
        }
      }
    }

    ctx.stroke();
    eCtx.stroke();
  });

  ctx.restore();
  eCtx.restore();
}

export function createProceduralGlobeTextures(
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  isDaylight: boolean = false
): ProceduralGlobeMaps {
  const width = isSoftwareGl ? 1024 : 2048;
  const height = isSoftwareGl ? 512 : 1024;
  const rand = seededRandom(42069);

  // 1. Albedo Canvas & Emissive Canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  // Fill emissive base black
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);

  // Deep Ocean Base Gradient matching the reference dark navy-teal sphere
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (isDaylight) {
    oceanGrad.addColorStop(0, '#0C1E38');
    oceanGrad.addColorStop(0.5, '#13325C');
    oceanGrad.addColorStop(1, '#0C1E38');
  } else {
    oceanGrad.addColorStop(0, '#070F1E');
    oceanGrad.addColorStop(0.5, '#0C1B33');
    oceanGrad.addColorStop(1, '#070F1E');
  }
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle micro dot-matrix texture across the ocean (clearly visible on the left limb in reference)
  const dotTile = document.createElement('canvas');
  const dotStep = isSoftwareGl ? 6 : 8;
  dotTile.width = dotStep;
  dotTile.height = dotStep;
  const dCtx = dotTile.getContext('2d')!;
  dCtx.fillStyle = 'rgba(130, 195, 255, 0.14)';
  dCtx.fillRect(dotStep / 2, dotStep / 2, 1.2, 1.2);
  const oceanDotPattern = ctx.createPattern(dotTile, 'repeat');
  if (oceanDotPattern) {
    ctx.fillStyle = oceanDotPattern;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw the swirling concentric oceanic topographical contour lines
  drawOceanicTopographicContours(ctx, eCtx, width, height, isSoftwareGl, isDaylight);

  // Build helper function to trace all continent paths
  const traceAllContinents = (targetCtx: CanvasRenderingContext2D, offsetX = 0, offsetY = 0) => {
    targetCtx.beginPath();
    for (const poly of WORLD_LAND_POLYGONS) {
      if (poly.length < 3) continue;
      poly.forEach(([lon, lat], idx) => {
        const [x, y] = lonLatToUv(lon, lat, width, height);
        if (idx === 0) targetCtx.moveTo(x + offsetX, y + offsetY);
        else targetCtx.lineTo(x + offsetX, y + offsetY);
      });
      targetCtx.closePath();
    }
  };

  // Multi-layer 3D Extruded Continental Cliff Rim (gives the stacked 3D architectural relief edge)
  const cliffSteps = isSoftwareGl ? 3 : 6;
  for (let s = cliffSteps; s >= 1; s--) {
    const offset = s * (isSoftwareGl ? 0.9 : 1.35);
    ctx.save();
    traceAllContinents(ctx, -offset * 0.7, offset * 0.85);
    ctx.fillStyle = s % 2 === 0 ? '#183256' : '#295284';
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.35)';
    ctx.lineWidth = isSoftwareGl ? 1.2 : 2.0;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Fill Main Continental Interior Mask & Clip for Night City Lights
  ctx.save();
  eCtx.save();
  traceAllContinents(ctx, 0, 0);
  traceAllContinents(eCtx, 0, 0);

  // Deep Midnight Indigo-Blue Continental Interior (matching South/North America in reference)
  const landGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isDaylight) {
    landGrad.addColorStop(0, '#183868');
    landGrad.addColorStop(0.5, '#204A85');
    landGrad.addColorStop(1, '#15325C');
  } else {
    landGrad.addColorStop(0, '#0B1830');
    landGrad.addColorStop(0.5, '#102344');
    landGrad.addColorStop(1, '#09152B');
  }
  ctx.fillStyle = landGrad;
  ctx.fill();

  // Black out ocean contour lines underneath continents on emissive map
  eCtx.fillStyle = '#040B18';
  eCtx.fill();

  // Clip to continental landmasses so all city lights & road filaments stay strictly on land
  ctx.clip();
  eCtx.clip();

  // Subtle continental dot-grid texture
  if (oceanDotPattern) {
    ctx.fillStyle = oceanDotPattern;
    ctx.fillRect(0, 0, width, height);
  }

  // Fine glowing highway / fiber filaments connecting nearby metropolitan hubs
  ctx.strokeStyle = isDaylight ? 'rgba(150, 215, 255, 0.18)' : 'rgba(255, 235, 180, 0.16)';
  ctx.lineWidth = isSoftwareGl ? 0.6 : 0.9;
  eCtx.strokeStyle = isDaylight ? 'rgba(110, 190, 255, 0.15)' : 'rgba(255, 225, 160, 0.18)';
  eCtx.lineWidth = ctx.lineWidth;

  ctx.beginPath();
  eCtx.beginPath();
  for (let i = 0; i < NIGHT_CITY_CLUSTERS.length; i++) {
    const [lonA, latA] = NIGHT_CITY_CLUSTERS[i];
    const [xA, yA] = lonLatToUv(lonA, latA, width, height);
    for (let j = i + 1; j < NIGHT_CITY_CLUSTERS.length; j++) {
      const [lonB, latB] = NIGHT_CITY_CLUSTERS[j];
      const degDist = Math.hypot(lonA - lonB, latA - latB);
      if (degDist < 14.5) {
        const [xB, yB] = lonLatToUv(lonB, latB, width, height);
        ctx.moveTo(xA, yA);
        ctx.lineTo(xB, yB);
        eCtx.moveTo(xA, yA);
        eCtx.lineTo(xB, yB);
      }
    }
  }
  ctx.stroke();
  eCtx.stroke();

  // Render glowing Metropolitan Night-Light Constellations & Coastal Sprawls
  for (const [cLon, cLat, intensity] of NIGHT_CITY_CLUSTERS) {
    const [cx, cy] = lonLatToUv(cLon, cLat, width, height);
    const scale = isSoftwareGl ? 0.55 : 1.0;

    // Soft golden-blue urban bloom halo
    const haloRadius = (16 + rand() * 14) * intensity * scale;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius);
    halo.addColorStop(0, 'rgba(255, 248, 220, 0.65)');
    halo.addColorStop(0.35, 'rgba(255, 220, 145, 0.28)');
    halo.addColorStop(0.7, 'rgba(100, 175, 255, 0.12)');
    halo.addColorStop(1, 'rgba(16, 35, 68, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    const eHalo = eCtx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius);
    eHalo.addColorStop(0, 'rgba(255, 245, 210, 0.85)');
    eHalo.addColorStop(0.4, 'rgba(255, 215, 130, 0.38)');
    eHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    eCtx.fillStyle = eHalo;
    eCtx.beginPath();
    eCtx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
    eCtx.fill();

    // Scatter 35-65 crisp sub-city pinpoint lights around each metro center
    const count = Math.floor((isSoftwareGl ? 22 : 48) * intensity);
    for (let k = 0; k < count; k++) {
      // Exponential radial distribution so core is dense and suburbs trail outward
      const angle = rand() * Math.PI * 2;
      const dist = Math.pow(rand(), 1.65) * 28 * intensity * scale;
      const px = cx + Math.cos(angle) * dist * 1.25;
      const py = cy + Math.sin(angle) * dist * 0.9;
      const dotR = (0.55 + rand() * 1.45) * scale;

      const isBrightCore = rand() > 0.65;
      const colorStr = isBrightCore
        ? '#FFFFFF'
        : rand() > 0.3
        ? '#FFE8A8'
        : '#9AD0FF';

      ctx.fillStyle = colorStr;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();

      eCtx.fillStyle = colorStr;
      eCtx.beginPath();
      eCtx.arc(px, py, dotR, 0, Math.PI * 2);
      eCtx.fill();
    }
  }

  ctx.restore();
  eCtx.restore();

  // Crisp Metallic Ice-Blue Top Rim Highlights along all Continental Coastlines
  ctx.save();
  traceAllContinents(ctx, 0, 0);
  ctx.strokeStyle = '#7CC4FF';
  ctx.lineWidth = isSoftwareGl ? 1.4 : 2.2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  traceAllContinents(ctx, 0.8, -0.8);
  ctx.strokeStyle = 'rgba(215, 240, 255, 0.72)';
  ctx.lineWidth = isSoftwareGl ? 0.7 : 1.1;
  ctx.stroke();
  ctx.restore();

  eCtx.save();
  traceAllContinents(eCtx, 0, 0);
  eCtx.strokeStyle = 'rgba(110, 190, 255, 0.55)';
  eCtx.lineWidth = isSoftwareGl ? 1.0 : 1.6;
  eCtx.stroke();
  eCtx.restore();

  // 2. Bump / Displacement Map (Continents physically raised with crisp coastal ridges)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#080808';
  bCtx.fillRect(0, 0, width, height);

  bCtx.save();
  traceAllContinents(bCtx, 0, 0);
  bCtx.fillStyle = '#D8D8D8';
  bCtx.strokeStyle = '#FFFFFF';
  bCtx.lineWidth = isSoftwareGl ? 2.5 : 4.5;
  bCtx.fill();
  bCtx.stroke();
  bCtx.restore();

  // 3. Roughness Map (Oceans have smooth satin specular highlight; Continents are matte-textured)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#4A4A4A'; // Satin ocean
  rCtx.fillRect(0, 0, width, height);
  rCtx.save();
  traceAllContinents(rCtx, 0, 0);
  rCtx.fillStyle = '#C8C8C8';
  rCtx.strokeStyle = '#252525'; // Metallic/glossy coastline rim
  rCtx.lineWidth = 3;
  rCtx.fill();
  rCtx.stroke();
  rCtx.restore();

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.ClampToEdgeWrapping;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = maxAnisotropy;

  return { colorMap, emissiveMap, bumpMap, roughnessMap };
}
