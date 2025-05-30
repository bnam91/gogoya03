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
from sklearn.preprocessing import normalize
import json

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

def calculate_views_score(influencer_views, brand_data):
    # 브랜드 진행 인플루언서들의 조회수 수집
    brand_views = []
    for data in brand_data:
        views = data.get('reels_views(15)')
        if views:
            try:
                # 문자열인 경우 쉼표 제거 후 정수로 변환
                if isinstance(views, str):
                    views = int(views.replace(',', ''))
                elif isinstance(views, (int, float)):
                    views = int(views)
                brand_views.append(views)
            except (ValueError, TypeError):
                continue
    
    if not brand_views:
        return 0, 0, 0
    
    # 조회수 정렬
    sorted_views = sorted(brand_views)
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

def calculate_category_score(influencer_category, brand_collaboration_data):
    # 브랜드 협업 인플루언서들의 카테고리 분포 분석
    category_distribution = {}
    category_frequency = {}  # 카테고리 출현 빈도
    total_influencers = len(brand_collaboration_data)
    
    for data in brand_collaboration_data:
        category = data.get('category', '')
        if category:
            categories = category.split(',')
            for cat in categories:
                if '(' in cat:
                    cat_name = cat.split('(')[0].strip()
                    percentage = int(cat.split('(')[1].split('%')[0])
                    
                    # 카테고리별 비율 수집
                    if cat_name not in category_distribution:
                        category_distribution[cat_name] = []
                    category_distribution[cat_name].append(percentage)
    
                    # 카테고리 출현 빈도 계산
                    if cat_name not in category_frequency:
                        category_frequency[cat_name] = 0
                    category_frequency[cat_name] += 1
    
    # 카테고리별 평균 비율과 출현 빈도 점수 계산
    category_scores = {}
    for category, percentages in category_distribution.items():
        avg_percentage = sum(percentages) / len(percentages)
        frequency_score = (category_frequency[category] / total_influencers) * 100  # 출현 빈도 백분율
        
        # 최종 점수 계산 (출현 빈도 60%, 평균 비율 40% 가중치)
        final_score = (frequency_score * 0.6) + (avg_percentage * 0.4)
        category_scores[category] = final_score
    
    # 주요 카테고리 찾기 (최종 점수가 가장 높은 카테고리)
    main_category = max(category_scores.items(), key=lambda x: x[1])
    main_category_avg = category_distribution[main_category[0]]  # 해당 카테고리의 모든 비율
    
    # 입력된 인플루언서의 카테고리 분석
    if not influencer_category:
        return 0, None, None
    
    # 주요 카테고리 비율 확인
    main_category_ratio = 0
    categories = influencer_category.split(',')
    for cat in categories:
        if '(' in cat:
            cat_name = cat.split('(')[0].strip()
            percentage = int(cat.split('(')[1].split('%')[0])
            if cat_name == main_category[0]:
                main_category_ratio = percentage
                break
    
    # 평균과의 차이 계산
    avg_main_category = sum(main_category_avg) / len(main_category_avg)
    difference = abs(main_category_ratio - avg_main_category)
    
    # 점수 계산 (평균과 가까울수록 높은 점수)
    # 차이가 0이면 100점, 차이가 50% 이상이면 0점
    score = max(0, 100 - (difference * 2))
    
    return score, main_category[0], avg_main_category

def analyze_top_tags(brand_data):
    # 모든 태그 수집
    all_tags = []
    for data in brand_data:
        tags = data.get('tags', [])
        if isinstance(tags, list):
            all_tags.extend(tags)
    
    # 태그 빈도수 계산
    tag_counter = Counter(all_tags)
    
    # 상위 20개 태그 추출
    top_tags = tag_counter.most_common(20)
    
    return top_tags

def calculate_tag_similarity(brand_top_tags, influencer_tags, user_keywords=None):
    """
    브랜드 인플루언서들의 상위 태그와 대상 인플루언서의 태그 간의 코사인 유사도를 계산
    
    Args:
        brand_top_tags: 브랜드 인플루언서들의 상위 태그 리스트 (태그, 빈도수) 튜플의 리스트
        influencer_tags: 대상 인플루언서의 태그 리스트
        user_keywords: 사용자가 입력한 키워드 리스트
    
    Returns:
        tuple: (태그 유사도 점수 (0~100), 상세 분석 결과 딕셔너리)
    """
    if not brand_top_tags or not influencer_tags:
        return 0, {}
    
    # 태그 리스트 준비
    brand_tags = [tag for tag, _ in brand_top_tags]
    
    # 사용자 키워드가 있는 경우 추가
    if user_keywords:
        # 중복 제거를 위해 set 사용
        all_tags = list(set(brand_tags + user_keywords))
    else:
        all_tags = brand_tags
    
    # 태그를 공백으로 구분된 문자열로 변환
    brand_tags_str = ' '.join(brand_tags)
    influencer_tags_str = ' '.join(influencer_tags)
    
    # TF-IDF 벡터화 (token_pattern=None으로 설정하여 경고 제거)
    vectorizer = TfidfVectorizer(
        analyzer='word',
        tokenizer=lambda x: x.split(),
        token_pattern=None,  # tokenizer를 사용하므로 token_pattern은 None으로 설정
        min_df=1,  # 최소 문서 빈도수
        max_df=1.0  # 최대 문서 빈도수
    )
    
    try:
        # 벡터화 수행
        tfidf_matrix = vectorizer.fit_transform([brand_tags_str, influencer_tags_str])
        
        # 코사인 유사도 계산
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0][0]
        
        # 점수를 0-100 범위로 변환
        score = cosine_sim * 100
        
        # 상세 분석 결과 저장
        analysis_result = {
            'brand_tags': brand_tags,
            'influencer_tags': influencer_tags,
            'user_keywords': user_keywords if user_keywords else [],
            'tfidf_matrix': tfidf_matrix.toarray().tolist(),
            'cosine_similarity': cosine_sim,
            'final_score': score,
            'feature_names': vectorizer.get_feature_names_out().tolist()
        }
        
        return score, analysis_result
        
    except Exception as e:
        print(f"태그 유사도 계산 중 오류 발생: {e}")
        return 0, {}

# MongoDB 연결 설정
print("\nMongoDB 연결 중...")
uri = "mongodb+srv://coq3820:JmbIOcaEOrvkpQo1@cluster0.qj1ty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'), tlsAllowInvalidCertificates=True)

try:
    # 연결 확인
    client.admin.command('ping')
    print("MongoDB 연결 성공!")
    
    # 현재 시간과 저장 디렉토리 설정
    current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    current_dir = os.path.dirname(os.path.abspath(__file__))
    save_dir = os.path.join(current_dir, "matchingRaw")
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    
    # 데이터베이스와 컬렉션 선택
    db = client['insta09_database']
    brand_collection = db['08_main_brand_category_data']
    influencer_collection = db['02_main_influencer_data']
    
    # 브랜드 이름 입력 받기
    brand_name = input("\n매칭할 브랜드를 입력하세요: ")
    # 여러 개의 매칭 아이템 입력받기
    item_names = input("\n매칭할 아이템을 입력하세요(진행이력조회, 쉼표로 구분): ").split(',')
    item_names = [item.strip() for item in item_names if item.strip()]
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
    print("\n[협업 인플루언서 정보]")
    print("-" * 50)
    
    # 협업 이력 정보를 저장할 리스트
    collaboration_history = []
    
    # 3개월 전 날짜 계산
    three_months_ago = datetime.now() - timedelta(days=90)
    
    # 인플루언서별로 그룹화
    influencer_groups = {}
    
    for data in brand_data:
        username = data.get('username')
        category = data.get('category', '')
        views = data.get('reels_views(15)', 0)
        if username:
            brand_influencers.add(username)
            print(f"인플루언서: {username}")
            print(f"카테고리: {category}")
            try:
                if isinstance(views, str):
                    views = int(views.replace(',', ''))
                print(f"릴스평균조회수: {views:,}")
            except (ValueError, TypeError):
                print(f"릴스평균조회수: {views}")
            print("-" * 50)
            
            # 해당 인플루언서의 모든 브랜드 협업 이력 조회
            influencer_collaborations = list(influencer_collection.find({
                "username": username,
                "brand": {"$exists": True}
            }))
            
            # 협업 이력 정보 수집 (최근 3개월 데이터만)
            for collab in influencer_collaborations:
                for brand in collab.get('brand', []):
                    brand_name = brand.get('name', '')
                    # '확인필요' 브랜드와 'N' 브랜드 제외
                    if brand_name == '확인필요' or brand_name == 'N':
                        continue
                        
                    for product in brand.get('products', []):
                        mentioned_date = datetime.strptime(product.get('mentioned_date', ''), "%Y-%m-%dT%H:%M:%S.%fZ")
                        if mentioned_date >= three_months_ago:
                            if username not in influencer_groups:
                                influencer_groups[username] = set()
                            influencer_groups[username].add(brand_name)
    
    # 모든 브랜드 목록 수집
    all_brands = set()
    for brands in influencer_groups.values():
        all_brands.update(brands)
    
    # 각 브랜드별 인플루언서 수 계산
    brand_counts = {}
    for brand in all_brands:
        count = sum(1 for brands in influencer_groups.values() if brand in brands)
        brand_counts[brand] = count
    
    # 인플루언서 수 기준으로 정렬
    sorted_brands = sorted(brand_counts.items(), key=lambda x: x[1], reverse=True)
    
    # 상위 20% 브랜드 선정 (20%가 15개 미만이면 상위 15개 사용)
    top_20_percent = max(15, int(len(sorted_brands) * 0.2))
    max_brands = min(top_20_percent, len(sorted_brands))
    filtered_brands = sorted_brands[:max_brands]
    
    print(f"\n{brand_info['name']}와 이미 협업한 인플루언서 수: {len(brand_influencers)}명")
    
    # 브랜드 인플루언서들의 상위 태그 분석
    top_tags = analyze_top_tags(brand_data)
    
    # MongoDB에서 전체 인플루언서 데이터 조회
    print("\n전체 인플루언서 데이터 조회 중...")
    all_influencers = list(influencer_collection.find({}))
    print(f"전체 인플루언서 수: {len(all_influencers)}명")
    
    # 선호 브랜드 추출 (협업 인플루언서 2명 이상)
    preferred_brands = [brand for brand, count in filtered_brands]
    total_preferred = len(preferred_brands)
    if total_preferred == 0:
        preferred_brands = set()
    else:
        preferred_brands = set(preferred_brands)
    
    # 선호 브랜드별 인기도(협업 인플루언서 수) 딕셔너리 생성
    preferred_brand_weights = {brand: count for brand, count in filtered_brands}
    
    # 모든 인플루언서의 선호 브랜드 협업 점수 계산
    all_influencer_scores = []
    for influencer in all_influencers:
        if influencer['username'] in brand_influencers:
            continue
            
        brand_weight_sum = 0
        for brand_data_item in influencer.get('brand', []):
            brand_name = brand_data_item.get('name', '')
            if brand_name in preferred_brand_weights:
                brand_weight_sum += preferred_brand_weights[brand_name]
        
        all_influencer_scores.append({
            'username': influencer['username'],
            'score': brand_weight_sum
        })
    
    # 점수 기준으로 정렬
    all_influencer_scores.sort(key=lambda x: x['score'], reverse=True)
    total_candidates = len(all_influencer_scores)
    
    # 점수-순위 매핑 딕셔너리 생성
    score_to_rank = {}
    for rank, data in enumerate(all_influencer_scores, 1):
        score_to_rank[data['username']] = rank
    
    # 각 인플루언서의 카테고리 점수와 조회수 점수 계산
    print("\n점수 계산 중...")
    influencer_scores = []
    target_views = None
    avg_views = None
    main_category = None
    main_category_avg = None
    
    # 코사인 유사도 분석 결과를 저장할 리스트
    cosine_analysis_results = []
    
    for influencer in tqdm(all_influencers, desc="점수 계산"):
        # 이미 브랜드와 협업한 인플루언서는 제외
        if influencer['username'] in brand_influencers:
            continue
            
        category = influencer.get('category', '')
        views = influencer.get('reels_views(15)', 0)
        tags = influencer.get('tags', [])
        
        category_score, main_cat, main_avg = calculate_category_score(category, brand_data)
        views_score, target_v, avg_v = calculate_views_score(views, brand_data)
        tag_score, tag_analysis = calculate_tag_similarity(top_tags, tags, user_keywords)
        
        # 코사인 유사도 분석 결과 저장
        if tag_analysis:
            cosine_analysis_results.append({
                'username': influencer['username'],
                'analysis': tag_analysis
            })
        
        if target_views is None:
            target_views = target_v
            avg_views = avg_v
            main_category = main_cat
            main_category_avg = main_avg
        
        # 순위 기반 백분율 점수 계산 (상위 순위일수록 높은 점수)
        rank = score_to_rank.get(influencer['username'], total_candidates)
        preferred_score = ((total_candidates - rank + 1) / total_candidates) * 100
        
        # 최종 점수 계산 (카테고리 17.5%, 조회수 17.5%, 태그유사도 35%, 선호브랜드 30%)
        final_score = (category_score * 0.175) + (views_score * 0.175) + (tag_score * 0.35) + (preferred_score * 0.3)
        
        influencer_scores.append({
            'username': influencer['username'],
            'final_score': final_score,
            'category_score': category_score,
            'views_score': views_score,
            'tag_score': tag_score,
            'preferred_score': preferred_score,
            'category': category,
            'views': views,
            'tags': tags,
            'profile_link': influencer.get('profile_link', '')
        })
    
    # 점수 기준으로 정렬하여 상위 60명 선정
    influencer_scores.sort(key=lambda x: x['final_score'], reverse=True)
    
    # is_contact_excluded가 true인 인플루언서 제외하고 상위 60명 선정
    filtered_scores = []
    for score in influencer_scores:
        influencer = influencer_collection.find_one({"username": score['username']})
        if influencer and influencer.get('is_contact_excluded', False):
            continue
        filtered_scores.append(score)
        if len(filtered_scores) >= 60:
            break
    
    top_60 = filtered_scores
    
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
                        # 여러 개의 아이템 중 하나라도 포함되면 추가
                        if any(item_name in product.get('item', '') or item_name in product.get('category2', '') for item_name in item_names):
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
            '선호브랜드점수': influencer.get('preferred_score', 0),
            '카테고리': influencer['category'],
            '릴스평균조회수': influencer['views'],
            '가성비인플루언서': 'O' if is_cost_effective else 'X',
            '주요태그': ', '.join(influencer['tags'][:5]),
            '최근협업이력': collaboration_info
        })
    
    # DataFrame 생성
    df = pd.DataFrame(results_data)
    
    # 현재 시간을 파일명에 포함
    excel_filename = f"{brand_info['name']}_인플루언서_매칭결과_{current_time}.xlsx"
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
        
    # 결과 요약만 출력
    print(f"\n[분석 결과 요약]")
    print(f"브랜드 총 협업 인플루언서 수: {len(brand_influencers)}명")
    print(f"목표 조회수 중앙값: {target_views:,.0f}")
    print(f"전체 구간 평균 조회수: {avg_views:,.0f}")
    print(f"주요 카테고리: {main_category} (평균 비율: {main_category_avg:.1f}%)")
    print("\n[점수 계산 가중치]")
    print("- 카테고리 점수: 17.5%")
    print("- 조회수 점수: 17.5%")
    print("- 태그 유사도 점수: 35%")
    print("- 선호 브랜드 점수: 30%")
    print(f"\n{brand_info['name']} 인플루언서 상위 20개 태그:")
    for tag, count in top_tags:
        print(f"- {tag}: {count}회 사용")
    print(f"\n상위 60명의 인플루언서 매칭 결과는 엑셀 파일에서 확인하실 수 있습니다.")

except Exception as e:
    print(f"오류 발생: {e}")
