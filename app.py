from flask import Flask, render_template, jsonify
import feedparser
import requests
import html

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    try:
        # Use requests to fetch with a timeout to be safe, then parse content
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        
        releases = []
        for entry in feed.entries:
            # Safely extract fields
            title = entry.get("title", "No Title")
            link = entry.get("link", "")
            
            # Date parsing
            published = entry.get("published", "") or entry.get("updated", "")
            
            # Content/Summary
            summary = ""
            if "content" in entry and entry.content:
                summary = entry.content[0].value
            elif "summary" in entry:
                summary = entry.summary
                
            releases.append({
                "id": entry.get("id", link),
                "title": title,
                "link": link,
                "published": published,
                "summary": summary
            })
            
        return jsonify({
            "success": True,
            "title": feed.feed.get("title", "BigQuery Release Notes"),
            "releases": releases
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
