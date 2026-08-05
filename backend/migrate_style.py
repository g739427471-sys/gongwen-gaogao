"""迁移 writing_styles 表到新版多维Schema"""
import sqlite3
conn = sqlite3.connect('app.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(writing_styles)')
existing = {row[1] for row in cursor.fetchall()}
print(f"现有列: {existing}")

new_cols = [
    ('last_learned_at', 'TIMESTAMP'),
    ('version', 'INTEGER DEFAULT 1'),
    ('vocab_prefs', 'TEXT DEFAULT \'{}\''),
    ('syntax_habits', 'TEXT DEFAULT \'{}\''),
    ('para_structure', 'TEXT DEFAULT \'{}\''),
    ('open_close', 'TEXT DEFAULT \'{}\''),
    ('punct_habits', 'TEXT DEFAULT \'{}\''),
    ('length_prefs', 'TEXT DEFAULT \'{}\''),
    ('structure_patterns', 'TEXT DEFAULT \'{}\''),
    ('learn_history', 'TEXT DEFAULT \'[]\''),
    ('user_overrides', 'TEXT DEFAULT \'{}\''),
    ('created_at', 'TIMESTAMP'),
    ('updated_at', 'TIMESTAMP'),
]
for name, dtype in new_cols:
    if name not in existing:
        cursor.execute(f'ALTER TABLE writing_styles ADD COLUMN {name} {dtype}')
        print(f"  + {name}")
    else:
        print(f"  = {name} (exists)")
conn.commit()
conn.close()
print("迁移完成")
