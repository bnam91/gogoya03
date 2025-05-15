import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from collections import Counter
from tqdm import tqdm
from konlpy.tag import Okt
from sklearn.feature_extraction.text import CountVectorizer
from datetime import datetime, timedelta
import pandas as pd
import os
import subprocess

def calculate_similarity(brand_tags, influencer_tags):
    # 1. 정확한 매칭 점수 계산
    exact_matches = set(brand_tags).intersection(set(influencer_tags))
    exact_match_score = len(exact_matches) / len(brand_tags)
    
    # 2. TF-IDF 가중치 계산
    all_tags = brand_tags + influencer_tags
    tfidf = TfidfVectorizer()
    tfidf_matrix = tfidf.fit_transform(all_tags)
    tfidf_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0][0]
    
    # 3. 최종 점수 계산 (가중치 조정 가능)
    final_score = (0.7 * exact_match_score + 0.3 * tfidf_similarity)
    
    return final_score, exact_matches

def calculate_views_score(influencer_views, bas_data):
    # BAS 진행 인플루언서들의 조회수 수집
    bas_views = []
    for data in bas_data:
        views = data.get('reels_views(15)')
        if views:
            try:
                # 문자열인 경우 쉼표 제거 후 정수로 변환
                if isinstance(views, str):
                    views = int(views.replace(',', ''))
                elif isinstance(views, (int, float)):
                    views = int(views)
                bas_views.append(views)
            except (ValueError, TypeError):
                continue
    
    if not bas_views:
        return 0, 0, 0
    
    # 조회수 정렬
    sorted_views = sorted(bas_views)
    total_count = len(sorted_views)
    
    # 상위 10%와 하위 10% 제외
    exclude_count = int(total_count * 0.1)
    filtered_views = sorted_views[exclude_count:-exclude_count]
    
    if not filtered_views:
        return 0, 0, 0
    
    # 10개의 동일한 구간으로 나누기
    min_views = min(filtered_views)
    max_views = max(filtered_views)
    bin_size = (max_views - min_views) / 10
    
    # 각 구간별 인플루언서 수 계산
    view_distribution = [0] * 10
    for view in filtered_views:
        bin_index = min(int((view - min_views) / bin_size), 9)
        view_distribution[bin_index] += 1
    
    # 가장 많은 인플루언서가 있는 구간 찾기
    max_count_index = view_distribution.index(max(view_distribution))
    max_count = max(view_distribution)
    
    # 전체 구간의 평균 조회수 계산
    total_views = sum(filtered_views)
    avg_views = total_views / len(filtered_views)
    
    # 해당 구간의 중앙값 계산
    bin_start = min_views + (max_count_index * bin_size)
    bin_end = bin_start + bin_size
    target_views = (bin_start + bin_end) / 2  # 중앙값
    
    # 입력된 인플루언서의 조회수 변환
    try:
        if isinstance(influencer_views, str):
            influencer_views = int(influencer_views.replace(',', ''))
        elif isinstance(influencer_views, (int, float)):
            influencer_views = int(influencer_views)
        else:
            return 0, target_views, avg_views
    except (ValueError, TypeError):
        return 0, target_views, avg_views
    
    # 조회수가 범위를 벗어나면 0점
    if influencer_views < min_views or influencer_views > max_views:
        return 0, target_views, avg_views
    
    # 중앙값과의 차이 계산
    difference = abs(influencer_views - target_views)
    
    # 차이가 bin_size의 2배 이상이면 0점
    if difference > (bin_size * 2):
        return 0, target_views, avg_views
    
    # 중앙값에 가까울수록 높은 점수
    # 차이가 0이면 100점, 차이가 bin_size의 2배면 0점
    score = 100 * (1 - (difference / (bin_size * 2)))
    
    return score, target_views, avg_views

def calculate_category_score(influencer_category, bas_data):
    # BAS 진행 인플루언서들의 카테고리 분포 분석
    category_distribution = {}
    for data in bas_data:
        category = data.get('category', '')
        if category:
            categories = category.split(',')
            for cat in categories:
                if '(' in cat:
                    cat_name = cat.split('(')[0].strip()
                    percentage = int(cat.split('(')[1].split('%')[0])
                    if cat_name not in category_distribution:
                        category_distribution[cat_name] = []
                    category_distribution[cat_name].append(percentage)
    
    # 카테고리별 평균 비율 계산
    category_avg = {}
    for category, percentages in category_distribution.items():
        avg_percentage = sum(percentages) / len(percentages)
        category_avg[category] = avg_percentage
    
    # 주요 카테고리 찾기
    main_category = max(category_avg.items(), key=lambda x: x[1])
    main_category_avg = main_category[1]  # 평균 비율
    
    # 입력된 인플루언서의 카테고리 분석
    if not influencer_category:
        return 0, None, None
    
    # 홈/리빙 카테고리 비율 확인
    home_living_ratio = 0
    categories = influencer_category.split(',')
    for cat in categories:
        if '(' in cat:
            cat_name = cat.split('(')[0].strip()
            percentage = int(cat.split('(')[1].split('%')[0])
            if cat_name == main_category[0]:  # 주요 카테고리(홈/리빙)인 경우
                home_living_ratio = percentage
                break
    
    # 평균과의 차이 계산
    difference = abs(home_living_ratio - main_category_avg)
    
    # 점수 계산 (평균과 가까울수록 높은 점수)
    # 차이가 0이면 100점, 차이가 50% 이상이면 0점
    score = max(0, 100 - (difference * 2))
    
    return score, main_category[0], main_category_avg

def analyze_top_tags(bas_data):
    # 모든 태그 수집
    all_tags = []
    for data in bas_data:
        tags = data.get('tags', [])
        if isinstance(tags, list):
            all_tags.extend(tags)
    
    # 태그 빈도수 계산
    tag_counter = Counter(all_tags)
    
    # 상위 20개 태그 추출
    top_tags = tag_counter.most_common(20)
    
    return top_tags

def calculate_tag_similarity(bas_top_tags, influencer_tags, user_keywords=None):
    """
    BAS 인플루언서들의 상위 태그와 대상 인플루언서의 태그 간의 유사도를 계산
    
    Args:
        bas_top_tags: BAS 인플루언서들의 상위 태그 리스트 (태그, 빈도수) 튜플의 리스트
        influencer_tags: 대상 인플루언서의 태그 리스트
        user_keywords: 사용자가 입력한 키워드 리스트
    
    Returns:
        float: 태그 유사도 점수 (0~100)
    """
    if not bas_top_tags or not influencer_tags:
        return 0
    
    # 상위 태그의 최대 빈도수 찾기
    max_frequency = max(freq for _, freq in bas_top_tags)
    
    # 사용자 키워드 처리
    if user_keywords:
        # 상위 태그에 없는 키워드만 추가
        existing_tags = {tag for tag, _ in bas_top_tags}
        new_keywords = [(keyword, max_frequency) for keyword in user_keywords 
                       if keyword not in existing_tags]
        # 기존 태그와 새로운 키워드 합치기
        all_tags = bas_top_tags + new_keywords
    else:
        all_tags = bas_top_tags
    
    # 전체 태그 빈도수의 합 계산
    total_frequency = sum(freq for _, freq in all_tags)
    
    # 정확한 매칭 점수 계산 (빈도수 가중치 적용)
    exact_match_score = 0
    for tag, freq in all_tags:
        if tag in influencer_tags:
            # 빈도수에 비례하여 점수 부여
            exact_match_score += (freq / total_frequency)
    
    # 부분 매칭 점수 계산 (빈도수 가중치 적용)
    partial_match_score = 0
    for tag, freq in all_tags:
        for inf_tag in influencer_tags:
            # 한 태그가 다른 태그에 포함되어 있으면 부분 매칭으로 간주
            if tag in inf_tag or inf_tag in tag:
                # 빈도수에 비례하여 점수 부여 (정확한 매칭보다 낮은 가중치)
                partial_match_score += (freq / total_frequency) * 0.5
                break
    
    # 최종 점수 계산 (정확한 매칭 60%, 부분 매칭 40%)
    final_score = (exact_match_score * 0.6 + partial_match_score * 0.4) * 100
    
    return final_score

# MongoDB 연결 설정
print("\nMongoDB 연결 중...")
uri = "mongodb+srv://coq3820:JmbIOcaEOrvkpQo1@cluster0.qj1ty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'), tlsAllowInvalidCertificates=True)

try:
    # 연결 확인
    client.admin.command('ping')
    print("MongoDB 연결 성공!")
    
    # 데이터베이스와 컬렉션 선택
    db = client['insta09_database']
    brand_collection = db['08_main_brand_category_data']
    influencer_collection = db['02_main_influencer_data']
    
    # 브랜드 이름 입력 받기
    brand_name = input("\n매칭할 브랜드를 입력하세요: ")
    item_name = input("\n매칭할 아이템을 입력하세요(진행이력조회): ")
    user_keywords = input("\n매칭에 포함할 태그를 입력하세요(3개 / 쉼표로 구분): ").split(',')
    user_keywords = [keyword.strip() for keyword in user_keywords if keyword.strip()]
    print(f"\n{brand_name} 브랜드 분석을 시작합니다...")
    
    # 브랜드 정보 조회 (name 또는 aliases에 해당 브랜드가 포함된 경우)
    brand_info = brand_collection.find_one({
        "$or": [
            {"name": brand_name},
            {"aliases": brand_name}
        ]
    })
    
    if not brand_info:
        print(f"\n오류: {brand_name} 브랜드의 정보를 찾을 수 없습니다.")
        exit()
    
    # 브랜드의 모든 별칭 수집
    brand_aliases = set()
    brand_aliases.add(brand_info['name'])  # 원래 이름 추가
    if 'aliases' in brand_info:
        brand_aliases.update(brand_info['aliases'])  # 별칭들 추가
    
    print(f"\n브랜드 별칭 목록: {', '.join(brand_aliases)}")
    
    # 브랜드와 관련된 데이터 조회 (모든 별칭에 대해 검색)
    print(f"\n{brand_name} 브랜드 진행 인플루언서 정보 조회 중...")
    brand_data = list(influencer_collection.find({
        "brand.name": {"$in": list(brand_aliases)}
    }))
    
    if not brand_data:
        print(f"\n오류: {brand_name} 브랜드의 인플루언서 데이터를 찾을 수 없습니다.")
        exit()
    
    # 브랜드와 이미 협업한 인플루언서들의 username 목록 추출
    brand_influencers = set()
    for data in brand_data:
        username = data.get('username')
        if username:
            brand_influencers.add(username)
    
    print(f"{brand_name}와 이미 협업한 인플루언서 수: {len(brand_influencers)}명")
    
    # 브랜드 인플루언서들의 상위 태그 분석
    top_tags = analyze_top_tags(brand_data)
    
    # MongoDB에서 전체 인플루언서 데이터 조회
    print("\n전체 인플루언서 데이터 조회 중...")
    all_influencers = list(influencer_collection.find({}))
    print(f"전체 인플루언서 수: {len(all_influencers)}명")
    
    # 각 인플루언서의 카테고리 점수와 조회수 점수 계산
    print("\n점수 계산 중...")
    influencer_scores = []
    target_views = None
    avg_views = None
    main_category = None
    main_category_avg = None
    
    for influencer in tqdm(all_influencers, desc="점수 계산"):
        # 이미 브랜드와 협업한 인플루언서는 제외
        if influencer['username'] in brand_influencers:
            continue
            
        category = influencer.get('category', '')
        views = influencer.get('reels_views(15)', 0)
        tags = influencer.get('tags', [])
        
        category_score, main_cat, main_avg = calculate_category_score(category, brand_data)
        views_score, target_v, avg_v = calculate_views_score(views, brand_data)
        tag_score = calculate_tag_similarity(top_tags, tags, user_keywords)
        
        if target_views is None:
            target_views = target_v
            avg_views = avg_v
            main_category = main_cat
            main_category_avg = main_avg
        
        # 최종 점수 계산 (카테고리 30%, 조회수 30%, 태그 유사도 40%)
        final_score = (category_score * 0.3) + (views_score * 0.3) + (tag_score * 0.4)
        
        influencer_scores.append({
            'username': influencer['username'],
            'final_score': final_score,
            'category_score': category_score,
            'views_score': views_score,
            'tag_score': tag_score,
            'category': category,
            'views': views,
            'tags': tags,
            'profile_link': influencer.get('profile_link', '')
        })
    
    # 점수 기준으로 정렬하여 상위 60명 선정
    influencer_scores.sort(key=lambda x: x['final_score'], reverse=True)
    top_60 = influencer_scores[:60]
    
    # 결과를 DataFrame으로 변환
    results_data = []
    for influencer in top_60:
        try:
            views = int(str(influencer['views']).replace(',', ''))
            is_cost_effective = target_views < views < avg_views
        except (ValueError, TypeError):
            views = influencer['views']
            is_cost_effective = False
        
        # 최근 3개월간 아이템 관련 협업 이력 확인
        three_months_ago = datetime.now() - timedelta(days=90)
        influencer_brands = list(influencer_collection.find({
            "username": influencer['username'],
            "brand": {"$exists": True}
        }))
        
        item_collaborations = []
        for brand_data in influencer_brands:
            for brand in brand_data.get('brand', []):
                for product in brand.get('products', []):
                    mentioned_date = datetime.strptime(product.get('mentioned_date', ''), "%Y-%m-%dT%H:%M:%S.%fZ")
                    if mentioned_date >= three_months_ago:
                        if (item_name in product.get('item', '') or 
                            item_name in product.get('category2', '')):
                            item_collaborations.append({
                                'item': product.get('item', ''),
                                'category2': product.get('category2', ''),
                                'mentioned_date': product.get('mentioned_date', ''),
                                'item_feed_link': product.get('item_feed_link', '')
                            })
        
        # 협업 이력을 문자열로 변환
        collaboration_info = ""
        if item_collaborations:
            for collab in item_collaborations:
                collaboration_info += f"아이템: {collab['item']}\n"
                collaboration_info += f"카테고리: {collab['category2']}\n"
                collaboration_info += f"언급일: {collab['mentioned_date']}\n"
                collaboration_info += f"피드링크: {collab['item_feed_link']}\n\n"
            
        results_data.append({
            '순위': len(results_data) + 1,
            '인플루언서': influencer['username'],
            '프로필링크': influencer['profile_link'],
            '최종점수': round(influencer['final_score'], 1),
            '카테고리점수': round(influencer['category_score'], 1),
            '조회수점수': round(influencer['views_score'], 1),
            '태그유사도점수': round(influencer['tag_score'], 1),
            '카테고리': influencer['category'],
            '릴스평균조회수': influencer['views'],
            '가성비인플루언서': 'O' if is_cost_effective else 'X',
            '주요태그': ', '.join(influencer['tags'][:5]),
            '최근협업이력': collaboration_info
        })
    
    # DataFrame 생성
    df = pd.DataFrame(results_data)
    
    # 현재 시간을 파일명에 포함
    current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    excel_filename = f"{brand_name}_인플루언서_매칭결과_{current_time}.xlsx"
    
    # 저장 디렉토리 설정
    save_dir = "matchingRaw"
    # 디렉토리가 없으면 생성
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    save_path = os.path.join(save_dir, excel_filename)
    
    # 엑셀 파일로 저장
    df.to_excel(save_path, index=False, engine='openpyxl')
    print(f"\n분석 결과가 '{save_path}' 파일로 저장되었습니다.")
    
    # 저장된 폴더 열기
    try:
        # Windows에서 폴더 열기
        subprocess.Popen(['explorer', os.path.abspath(save_dir)])
        print(f"'{save_dir}' 폴더가 열렸습니다.")
    except Exception as e:
        print(f"폴더를 열지 못했습니다: {e}")
        
    # 결과 출력
    print(f"\n[분석 결과 요약]")
    print(f"브랜드 총 협업 인플루언서 수: {len(brand_influencers)}명")
    print(f"목표 조회수 중앙값: {target_views:,.0f}")
    print(f"전체 구간 평균 조회수: {avg_views:,.0f}")
    print(f"주요 카테고리: {main_category} (평균 비율: {main_category_avg:.1f}%)")
    print("\n[점수 계산 가중치]")
    print("- 카테고리 점수: 30%")
    print("- 조회수 점수: 30%")
    print("- 태그 유사도 점수: 40%")
    print(f"\n{brand_name} 인플루언서 상위 20개 태그:")
    for tag, count in top_tags:
        print(f"- {tag}: {count}회 사용")
    print(f"\n{brand_name} 브랜드와 새로운 협업 가능한 인플루언서 상위 60명:")
    print("-" * 80)
    for i, influencer in enumerate(top_60, 1):
        print(f"\n{i}위: {influencer['username']}")
        print(f"프로필: {influencer['profile_link']}")
        print(f"최종 점수: {influencer['final_score']:.1f}")
        print(f"카테고리 점수: {influencer['category_score']:.1f}")
        print(f"조회수 점수: {influencer['views_score']:.1f}")
        print(f"태그 유사도 점수: {influencer['tag_score']:.1f}")
        print(f"카테고리: {influencer['category']}")
        
        # 조회수 변환 및 가성비 체크
        try:
            views = int(str(influencer['views']).replace(',', ''))
            if target_views < views < avg_views:
                print(f"릴스평균조회수: {influencer['views']:,} (가성비 인플루언서)")
            else:
                print(f"릴스평균조회수: {influencer['views']:,}")
        except (ValueError, TypeError):
            print(f"릴스평균조회수: {influencer['views']}")
            
        print(f"주요 태그: {', '.join(influencer['tags'][:5])}")  # 상위 5개 태그만 표시
        
        # 최근 3개월간 아이템 관련 협업 이력 확인
        three_months_ago = datetime.now() - timedelta(days=90)
        
        # 해당 인플루언서의 브랜드 데이터 조회
        influencer_brands = list(influencer_collection.find({
            "username": influencer['username'],
            "brand": {"$exists": True}
        }))
        
        item_collaborations = []
        for brand_data in influencer_brands:
            for brand in brand_data.get('brand', []):
                for product in brand.get('products', []):
                    mentioned_date = datetime.strptime(product.get('mentioned_date', ''), "%Y-%m-%dT%H:%M:%S.%fZ")
                    if mentioned_date >= three_months_ago:
                        if (item_name in product.get('item', '') or 
                            item_name in product.get('category2', '')):
                            item_collaborations.append({
                                'item': product.get('item', ''),
                                'category2': product.get('category2', ''),
                                'mentioned_date': product.get('mentioned_date', ''),
                                'item_feed_link': product.get('item_feed_link', '')
                            })
        
        if item_collaborations:
            print("\n⚠️ 최근 3개월간 아이템 관련 협업 이력:")
            for collab in item_collaborations:
                print(f"- 아이템: {collab['item']}")
                print(f"  카테고리: {collab['category2']}")
                print(f"  언급일: {collab['mentioned_date']}")
                print(f"  피드 링크: {collab['item_feed_link']}")
        
        print("-" * 80)

except Exception as e:
    print(f"오류 발생: {e}")
