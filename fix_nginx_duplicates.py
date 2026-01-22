#!/usr/bin/env python3
"""
Fix duplicate location /api/images blocks in Nginx config
Keeps the first occurrence, removes duplicates
"""

import re
import sys
import shutil
from datetime import datetime

CONFIG_FILE = "/etc/nginx/sites-enabled/wicaalinvestments.com"

def fix_duplicates():
    # Backup
    backup_file = f"{CONFIG_FILE}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(CONFIG_FILE, backup_file)
    print(f"✅ Backup created: {backup_file}\n")
    
    # Read file
    with open(CONFIG_FILE, 'r') as f:
        lines = f.readlines()
    
    output = []
    in_api_images_block = False
    api_images_block_count = 0
    brace_count = 0
    skip_block = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this is a location /api/images block start
        if re.search(r'location\s+/api/images', line):
            api_images_block_count += 1
            
            if api_images_block_count == 1:
                # First occurrence - keep it
                output.append(line)
                in_api_images_block = True
                brace_count = line.count('{') - line.count('}')
                skip_block = False
            else:
                # Duplicate - skip it
                in_api_images_block = True
                brace_count = line.count('{') - line.count('}')
                skip_block = True
                print(f"🗑️  Removing duplicate block starting at line {i+1}")
            i += 1
            continue
        
        # If we're in a block
        if in_api_images_block:
            brace_count += line.count('{') - line.count('}')
            
            if not skip_block:
                # Keep lines from first block
                output.append(line)
            
            if brace_count == 0:
                # Block ended
                in_api_images_block = False
                skip_block = False
        else:
            # Normal line
            output.append(line)
        
        i += 1
    
    # Write output
    with open(CONFIG_FILE, 'w') as f:
        f.writelines(output)
    
    print(f"✅ Removed {api_images_block_count - 1} duplicate block(s)\n")
    return True

if __name__ == "__main__":
    try:
        fix_duplicates()
        print("✅ Config file fixed successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

