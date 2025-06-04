/**
 * 데이터베이스 설정 정보
 * 데이터베이스 이름과 컬렉션 이름을 정의한다.
 */
export const config = {
    database: {
        name: 'insta09_database',
        collections: {
            vendorBrandInfo: 'gogoya_vendor_brand_info',
            mainItemTodayData: '04_main_item_today_data',
            callRecords: 'gogoya_vendor_CallRecords',
            influencerData: '02_main_influencer_data',
            brandInfoCollection: 'gogoya_vendor_brand_info',
            dmRecords: 'gogoya_DmRecords'
        }
    }
}; 

// TODO: 메인 푸시 후 .gitignore에 추가 예정
