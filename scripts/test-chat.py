#!/usr/bin/env python3
"""
Test script for chatbot conversation
Reads prompts from a markdown file and sends them to the backend
"""

import argparse
import requests
import json
import time
import re
from pathlib import Path


def read_prompts(file_path):
    """Read prompts from markdown file, ignoring lines starting with ##"""
    prompts = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and lines starting with ##
            if line and not line.startswith('##'):
                # Remove markdown formatting if present
                if line.startswith('**User:**'):
                    line = line.replace('**User:**', '').strip()
                elif line.startswith('- '):
                    line = line[2:].strip()
                
                # Remove numbered list format (e.g., "1. Hello" -> "Hello")
                line = re.sub(r'^\d+\.\s*', '', line)
                
                if line:
                    prompts.append(line)
    
    return prompts


def send_message(backend_uri, message, mode, compress, session_id=None):
    """Send a message to the chatbot backend"""
    url = f"{backend_uri}/chat"
    
    payload = {
        "message": message,
        "mode": mode,
        "llmlingua_enabled": compress
    }
    
    if session_id:
        payload["session_id"] = session_id
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending message: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description='Test chatbot with conversation prompts')
    parser.add_argument('--mode', 
                       choices=['AIML', 'LLM', 'Hybrid'], 
                       default='Hybrid',
                       help='Chat mode (default: Hybrid)')
    parser.add_argument('--compress', 
                       action='store_true',
                       help='Enable LLMLingua compression')
    parser.add_argument('--backend', 
                       default='http://localhost:3011',
                       help='Backend URI (default: http://localhost:3011)')
    parser.add_argument('--file',
                       default='./prompts/full-chat.md',
                       help='Path to prompts file (default: ./prompts/full-chat.md)')
    parser.add_argument('--delay',
                       type=float,
                       default=1.0,
                       help='Delay between messages in seconds (default: 1.0)')
    
    args = parser.parse_args()
    
    # Read prompts
    print(f"Reading prompts from: {args.file}")
    prompts = read_prompts(args.file)
    print(f"Found {len(prompts)} prompts\n")
    
    # Test configuration
    print("=" * 80)
    print(f"Test Configuration:")
    print(f"  Mode: {args.mode}")
    print(f"  Compression: {'Enabled' if args.compress else 'Disabled'}")
    print(f"  Backend: {args.backend}")
    print(f"  Delay: {args.delay}s")
    print("=" * 80)
    print()
    
    # Run conversation
    session_id = None
    total_tokens = 0
    
    for i, prompt in enumerate(prompts, 1):
        print(f"\n[{i}/{len(prompts)}] User: {prompt}")
        
        # Send message
        result = send_message(args.backend, prompt, args.mode, args.compress, session_id)
        
        if result:
            # Store session ID for conversation continuity
            if not session_id and result.get('session_id'):
                session_id = result['session_id']
                print(f"Session ID: {session_id}")
            
            # Display response
            response = result.get('response', 'No response')
            source = result.get('source', 'Unknown')
            tokens = result.get('tokens', {})
            llmlingua_used = result.get('llmlingua_used', False)
            error = result.get('error')
            
            print(f"Bot: {response}")
            print(f"Source: {source}", end='')
            
            if llmlingua_used:
                print(" 🗜️", end='')
            
            if tokens.get('total', 0) > 0:
                print(f" | Tokens: {tokens['total']} (prompt: {tokens['prompt']}, completion: {tokens['completion']})", end='')
                total_tokens += tokens['total']
            
            print()
            
            if error:
                print(f"⚠️  Error: {error}")
        else:
            print("❌ Failed to get response")
        
        # Delay between messages
        if i < len(prompts):
            time.sleep(args.delay)
    
    # Summary
    print("\n" + "=" * 80)
    print("Test Summary:")
    print(f"  Total prompts: {len(prompts)}")
    print(f"  Total tokens used: {total_tokens}")
    print(f"  Session ID: {session_id}")
    print("=" * 80)


if __name__ == '__main__':
    main()
