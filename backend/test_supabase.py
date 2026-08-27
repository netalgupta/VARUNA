import psycopg

db1_url = "postgresql://postgres.anpvaxwncqsxetujkqce:HelloWorldIsSoLame@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
db2_url = "postgresql://postgres.skbxtnjcvutzgkzgrrxr:HelloWorldIsSoLame@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

print("==================================================")
print("TESTING DB 1 (Historical: 2022 -> July 2025)...")
try:
    with psycopg.connect(db1_url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = [r[0] for r in cur.fetchall()]
            print("DB1 Tables:", tables)
            
            cur.execute("SELECT count(*) FROM marine_data;")
            print("DB1 marine_data row count:", cur.fetchone()[0])
            
            cur.execute("SELECT min(time), max(time) FROM marine_data;")
            min_t, max_t = cur.fetchone()
            print(f"DB1 Time Range: {min_t} -> {max_t}")
except Exception as e:
    print("DB1 Error:", e)

print("\n==================================================")
print("TESTING DB 2 (Current: August 2025 -> Present)...")
try:
    with psycopg.connect(db2_url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = [r[0] for r in cur.fetchall()]
            print("DB2 Tables:", tables)
            
            cur.execute("SELECT count(*) FROM marine_data;")
            print("DB2 marine_data row count:", cur.fetchone()[0])
            
            cur.execute("SELECT min(time), max(time) FROM marine_data;")
            min_t, max_t = cur.fetchone()
            print(f"DB2 Time Range: {min_t} -> {max_t}")
            
            if "v_latest_positions" in tables or True:
                try:
                    cur.execute("SELECT count(*) FROM v_latest_positions;")
                    print("DB2 v_latest_positions count:", cur.fetchone()[0])
                    cur.execute("SELECT * FROM v_latest_positions LIMIT 3;")
                    print("DB2 Sample v_latest_positions:", cur.fetchall())
                except Exception as ve:
                    print("v_latest_positions check:", ve)
except Exception as e:
    print("DB2 Error:", e)
print("==================================================")
