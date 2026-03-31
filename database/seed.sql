-- ============================================================
-- Seed data — sample deals and events for development/demo
-- ============================================================

-- Helper: insert deal with PostGIS point
-- Format: ST_MakePoint(longitude, latitude)

INSERT INTO deals (title, description, store_name, category, deal_type, discount_text,
                   location, address, source_url, source_type, quality_score, is_active, is_verified)
VALUES

-- Food deals
('1-for-1 Original Recipe at KFC',
 'Valid every Tuesday with any app order. Student card not required.',
 'KFC', 'food', 'public', '1-for-1',
 ST_MakePoint(103.8481, 1.3006), '2 Orchard Turn, #B1-05, ION Orchard, Singapore 238801',
 'https://www.kfc.com.sg/promotions', 'web', 85, TRUE, TRUE),

('50% off all coffee Mon–Fri before 11am',
 'Flash your student card for an additional 10% off.',
 'Flash Coffee', 'food', 'student', '50% OFF',
 ST_MakePoint(103.8522, 1.2966), '180 Orchard Road, Singapore 238846',
 'https://www.flash-coffee.com/sg/promotions', 'web', 78, TRUE, FALSE),

('Buy 1 Get 1 Free – Bubble Tea',
 'All cup sizes. Valid Mon–Thu only.',
 'LiHO Tea', 'food', 'public', 'Buy 1 Get 1',
 ST_MakePoint(103.8530, 1.2986), '313 Orchard Road, Singapore 238895',
 'https://liho.com.sg/promotions', 'web', 72, TRUE, FALSE),

('Student Meal Set $4.50 – Includes drink',
 'Show your student card. Available at all NUS canteens.',
 'YIH Canteen', 'food', 'student', '$4.50 Meal',
 ST_MakePoint(103.7737, 1.2966), 'Yusof Ishak House, NUS, Singapore 119077',
 NULL, 'submitted', 88, TRUE, TRUE),

('$1 ice cream cone – McDonald''s McSavers',
 'Available at all participating McDonald''s outlets.',
 'McDonald''s', 'food', 'public', '$1',
 ST_MakePoint(103.8487, 1.3007), 'Multiple locations across Singapore',
 'https://www.mcdonalds.com.sg/mcsavers', 'web', 70, TRUE, TRUE),

-- Shopping deals
('Apple Education Store – up to $200 off MacBooks',
 'Valid with any valid student or educator ID. Free AirPods with MacBook Pro.',
 'Apple', 'tech', 'student', 'Up to $200 OFF',
 ST_MakePoint(103.8315, 1.3048), '270 Orchard Road, Knightsbridge, Singapore 238859',
 'https://www.apple.com/sg_edu_hq/', 'web', 92, TRUE, TRUE),

('ZALORA Student Discount – 15% off sitewide',
 'Use code STUDENT15 at checkout. Valid for verified .edu.sg email holders.',
 'ZALORA', 'shopping', 'student', '15% OFF',
 ST_MakePoint(103.8198, 1.3521), 'Online – Singapore delivery',
 'https://www.zalora.com.sg/student-discount', 'web', 76, TRUE, FALSE),

('Uniqlo – LifeWear Sale up to 50% off',
 'Selected items only. In-store and online.',
 'Uniqlo', 'shopping', 'public', 'Up to 50% OFF',
 ST_MakePoint(103.8481, 1.3006), '2 Orchard Turn, ION Orchard B2, Singapore 238801',
 'https://www.uniqlo.com/sg/en/sale', 'web', 80, TRUE, TRUE),

-- Tech deals
('Challenger – Student Tech Bundle: Laptop + Bag + Mouse from $699',
 'Show student card in store. Includes 1-year warranty extension.',
 'Challenger', 'tech', 'student', 'Bundle from $699',
 ST_MakePoint(103.8481, 1.3006), '435 Orchard Road, Wisma Atria #04-00, Singapore 238877',
 'https://www.challenger.sg/student', 'web', 74, TRUE, FALSE),

-- Events
('National Day Sale – Free entry to Gardens by the Bay',
 'Free entry to Flower Dome and Cloud Forest on 9 Aug. Limited slots.',
 'Gardens by the Bay', 'events', 'public', 'FREE',
 ST_MakePoint(103.8636, 1.2816), '18 Marina Gardens Dr, Singapore 018953',
 'https://www.gardensbythebay.com.sg', 'web', 90, TRUE, TRUE),

-- Beauty
('Student Facial Package – 3 sessions for $88',
 'Introductory package for full-time students. Show student card.',
 'Porcelain Skin', 'beauty', 'student', '$88 for 3 sessions',
 ST_MakePoint(103.8317, 1.3060), '391A Orchard Road, Ngee Ann City Tower B, Singapore 238874',
 NULL, 'submitted', 68, TRUE, FALSE),

-- Fitness
('Anytime Fitness – Student Membership $49/month',
 'Access to all Singapore clubs. No joining fee for students.',
 'Anytime Fitness', 'fitness', 'student', '$49/month',
 ST_MakePoint(103.8198, 1.3521), 'Multiple locations across Singapore',
 'https://www.anytimefitness.com.sg/membership', 'web', 77, TRUE, FALSE),

-- Entertainment
('Cathay Cineplexes – Student Tuesday $8',
 'Standard seats only. Excludes blockbusters on opening weekend.',
 'Cathay Cineplexes', 'entertainment', 'student', '$8 tickets',
 ST_MakePoint(103.8454, 1.3015), 'The Cathay, 2 Handy Road, Singapore 229233',
 'https://www.cathaycineplexes.com.sg/deals', 'web', 82, TRUE, FALSE);


-- ── Sample Events ─────────────────────────────────────────────────────────────

INSERT INTO events (title, description, organizer, category, location, address, venue_name,
                    start_date, end_date, is_free, price, source_url, is_student_eligible, is_active)
VALUES

('Singapore Food Festival 2025',
 'Annual celebration of Singapore''s vibrant food culture. Over 100 hawkers and pop-up stalls.',
 'Singapore Tourism Board', 'Food',
 ST_MakePoint(103.8651, 1.2897), '1 Bayfront Ave, Singapore 018971', 'Marina Bay Sands Event Plaza',
 '2025-08-01 11:00:00+08', '2025-08-10 22:00:00+08',
 TRUE, NULL,
 'https://www.singaporefoodfestival.com', FALSE, TRUE),

('Tech Career Fair – NUS',
 'Connect with 80+ top tech employers. Bring your resume. Open to all university students.',
 'NUS Career Centre', 'Tech',
 ST_MakePoint(103.7737, 1.2966), 'University Cultural Centre, NUS, Singapore 119077', 'UCC Hall',
 '2025-09-15 10:00:00+08', '2025-09-15 18:00:00+08',
 TRUE, NULL,
 'https://nus.edu.sg/careers', TRUE, TRUE),

('Affordable Art Fair Singapore',
 'International contemporary art fair with works starting from $100.',
 'Affordable Art Fair', 'Culture',
 ST_MakePoint(103.8650, 1.2854), '10 Bayfront Ave, Singapore 018956', 'Marina Bay Sands Expo',
 '2025-10-23 11:00:00+08', '2025-10-26 20:00:00+08',
 FALSE, 25,
 'https://affordableartfair.com/singapore', FALSE, TRUE),

('Open Mic Night – Free Entry',
 'Monthly open mic for musicians, poets, and comedians. Sign up at the door.',
 'Timbre Music', 'Entertainment',
 ST_MakePoint(103.8530, 1.2915), 'The Arts House, 1 Old Parliament Lane, Singapore 179429', 'The Arts House',
 '2025-08-20 19:00:00+08', '2025-08-20 23:00:00+08',
 TRUE, NULL, NULL, FALSE, TRUE),

('Student Wellness Week – Free Yoga & Meditation',
 'Daily yoga, meditation, and mental wellness workshops. Open to all students.',
 'NTU Student Affairs', 'Fitness',
 ST_MakePoint(103.6831, 1.3483), 'Sports Hall 1, NTU, Singapore 639798', 'NTU Sports Hall',
 '2025-09-01 08:00:00+08', '2025-09-05 18:00:00+08',
 TRUE, NULL, NULL, TRUE, TRUE);
