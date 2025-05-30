/**
 * 네이버 데이터랩 API를 사용하여 카테고리별 검색 트렌드를 분석하고 시각화하는 프로그램
 * 
 * 기능:
 * - 카테고리의 5년, 3년, 1년 월별 검색 트렌드를 조회
 * - 각 기간별 데이터를 차트로 시각화
 * - 검색량은 상대값(%)으로 표시 (최고 검색량을 100%로 설정)
 * 
 * 사용법:
 * 1. node naver.trend.chart.category.js 실행
 * 2. 프롬프트에 카테고리 코드 입력 (예: 50000000 - 패션의류)
 * 3. trend_chart.html 파일이 생성되며, 웹 브라우저에서 차트 확인 가능
 * 
 * 차트 설명:
 * - 5년 데이터: 청록색 차트
 * - 3년 데이터: 분홍색 차트
 * - 1년 데이터: 파란색 차트
 * 
 * 주의사항:
 * - 네이버 데이터랩 API는 최대 5년 데이터만 제공
 * - 검색량은 상대값이므로, 기간별로 최고값이 100%로 표시됨
 * - 현재 달의 데이터는 제외됨 (전달 말일까지의 데이터만 표시)
 */

const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// HTML 파일 경로 설정
const HTML_FILE = 'category_trend_chart.html';

// 초기 HTML 파일 생성
const initialHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>검색어 트렌드</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { padding: 20px; font-family: Arial, sans-serif; }
        .chart-container { width: 1000px; height: 500px; margin: 20px auto; }
        .category-info { 
            width: 1000px; 
            margin: 20px auto; 
            padding: 15px; 
            background-color: #f8f9fa; 
            border-radius: 5px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="category-info" id="categoryInfo"></div>
    <div class="chart-container">
        <canvas id="trendChart5Y"></canvas>
    </div>
    <div class="chart-container">
        <canvas id="trendChart3Y"></canvas>
    </div>
    <div class="chart-container">
        <canvas id="trendChart1Y"></canvas>
    </div>
</body>
</html>`;

// 초기 HTML 파일 생성
if (!fs.existsSync(HTML_FILE)) {
    fs.writeFileSync(HTML_FILE, initialHtml);
}

async function getCategoryTrend(categoryCode) {
    try {
        const endDate = new Date();
        endDate.setDate(1); // 현재 달의 첫날로 설정
        endDate.setDate(endDate.getDate() - 1); // 전달 말일로 설정
        
        // 5년 데이터
        const startDate5Y = new Date(endDate);
        startDate5Y.setFullYear(startDate5Y.getFullYear() - 5);

        // 3년 데이터
        const startDate3Y = new Date(endDate);
        startDate3Y.setFullYear(startDate3Y.getFullYear() - 3);

        // 1년 데이터
        const startDate1Y = new Date(endDate);
        startDate1Y.setFullYear(startDate1Y.getFullYear() - 1);

        // 5년 데이터 요청
        const requestBody5Y = {
            startDate: startDate5Y.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            timeUnit: "month",
            category: [
                {
                    "name": "카테고리",
                    "param": [categoryCode]
                }
            ],
            device: "pc",
            gender: "m",
            ages: ["10", "20", "30", "40", "50", "60"]
        };

        // 3년 데이터 요청
        const requestBody3Y = {
            ...requestBody5Y,
            startDate: startDate3Y.toISOString().split('T')[0]
        };

        // 1년 데이터 요청
        const requestBody1Y = {
            ...requestBody5Y,
            startDate: startDate1Y.toISOString().split('T')[0]
        };

        const [response5Y, response3Y, response1Y] = await Promise.all([
            axios.post('https://openapi.naver.com/v1/datalab/shopping/categories', requestBody5Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            }),
            axios.post('https://openapi.naver.com/v1/datalab/shopping/categories', requestBody3Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            }),
            axios.post('https://openapi.naver.com/v1/datalab/shopping/categories', requestBody1Y, {
                headers: {
                    'X-Naver-Client-Id': 'GQMIvTMEGg6ea83sZUGe',
                    'X-Naver-Client-Secret': 'MraZMTF88_',
                    'Content-Type': 'application/json'
                }
            })
        ]);

        const result5Y = response5Y.data.results[0];
        const result3Y = response3Y.data.results[0];
        const result1Y = response1Y.data.results[0];

        // 마지막 달 제외
        const data5Y = result5Y.data.slice(0, -1);
        const data3Y = result3Y.data.slice(0, -1);
        const data1Y = result1Y.data.slice(0, -1);
        // 네이버 트렌드 방식으로 정규화 (각 기간 내 최대값이 100)
        const max5Y = Math.max(...data5Y.map(item => item.ratio));
        const normalized5Y = data5Y.map(item => (item.ratio / max5Y) * 100);
        const max3Y = Math.max(...data3Y.map(item => item.ratio));
        const normalized3Y = data3Y.map(item => (item.ratio / max3Y) * 100);
        const max1Y = Math.max(...data1Y.map(item => item.ratio));
        const normalized1Y = data1Y.map(item => (item.ratio / max1Y) * 100);
        const labels5Y = data5Y.map(item => item.period);
        const labels3Y = data3Y.map(item => item.period);
        const labels1Y = data1Y.map(item => item.period);

        // 디버깅: 실제 API에서 받은 1년 데이터 원본 출력
        console.log('\n[API 원본 1년 데이터]');
        result1Y.data.forEach(item => {
            console.log(`${item.period}: ${item.ratio}`);
        });

        console.log(`\n[카테고리 코드: ${categoryCode}]`);
        console.log('5년간 월별 검색량:');
        result5Y.data.forEach(item => {
            console.log(`${item.period}: ${item.ratio}%`);
        });
        console.log('-'.repeat(50));
        console.log('3년간 월별 검색량:');
        result3Y.data.forEach(item => {
            console.log(`${item.period}: ${item.ratio}%`);
        });
        console.log('-'.repeat(50));
        console.log('1년간 월별 검색량:');
        result1Y.data.forEach(item => {
            console.log(`${item.period}: ${item.ratio}%`);
        });
        console.log('-'.repeat(50));

        // HTML 파일 읽기
        let html = fs.readFileSync(HTML_FILE, 'utf8');
        
        // 기존 스크립트 제거
        html = html.replace(/<script>[\s\S]*?<\/script>/g, '');
        
        // 새로운 차트 데이터 스크립트 추가
        const updateScript = `
            // 카테고리 정보 업데이트
            document.getElementById('categoryInfo').textContent = '카테고리 코드: ${categoryCode}';
            
            // 5년 차트
            new Chart(document.getElementById('trendChart5Y'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(labels5Y)},
                    datasets: [{
                        label: '카테고리 검색량 (5년)',
                        data: ${JSON.stringify(normalized5Y)},
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: '5년간 월별 카테고리 검색 트렌드',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '검색량 (상대값)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '날짜'
                            }
                        }
                    }
                }
            });

            // 3년 차트
            new Chart(document.getElementById('trendChart3Y'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(labels3Y)},
                    datasets: [{
                        label: '카테고리 검색량 (3년)',
                        data: ${JSON.stringify(normalized3Y)},
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1,
                        fill: true,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: '3년간 월별 카테고리 검색 트렌드',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '검색량 (상대값)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '날짜'
                            }
                        }
                    }
                }
            });

            // 1년 차트
            new Chart(document.getElementById('trendChart1Y'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(labels1Y)},
                    datasets: [{
                        label: '카테고리 검색량 (1년)',
                        data: ${JSON.stringify(normalized1Y)},
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1,
                        fill: true,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: '1년간 월별 카테고리 검색 트렌드',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '검색량 (상대값)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '날짜'
                            }
                        }
                    }
                }
            });
        `;
        
        // 스크립트 삽입
        html = html.replace('</body>', `<script>${updateScript}</script></body>`);
        
        // HTML 파일 저장
        fs.writeFileSync(HTML_FILE, html);
        console.log(`\n그래프가 ${HTML_FILE} 파일로 업데이트되었습니다.`);
        console.log('웹 브라우저에서 파일을 열어 그래프를 확인하세요.');

    } catch (error) {
        console.error('에러 발생:', error.message);
        if (error.response) {
            console.error('상세 에러:', error.response.data);
        }
    }
}

console.log('카테고리 코드를 입력하세요 (예: 50000000 - 패션의류):');
rl.on('line', (categoryCode) => {
    if (categoryCode.trim()) {
        getCategoryTrend(categoryCode.trim());
    } else {
        console.log('카테고리 코드를 입력해주세요.');
    }
    console.log('\n카테고리 코드를 입력하세요 (종료하려면 Ctrl+C):');
}); 