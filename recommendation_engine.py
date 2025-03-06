from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import mysql.connector

app = Flask(__name__)

# Connect to MySQL
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456789",  # Replace with your MySQL password
        database="book_recommendations"
    )

# Fetch books from database
def load_books():
    conn = get_db_connection()
    query = "SELECT title, author, genre, description, year_of_publication FROM books"
    df = pd.read_sql(query, conn)
    conn.close()
    return df

# Build recommendation model
def build_recommendation_model():
    df = load_books()
    
    # Combine features into a single string for each book
    df['features'] = df['title'].fillna('') + ' ' + df['author'].fillna('') + ' ' + \
                     df['genre'].fillna('') + ' ' + df['description'].fillna('') + ' ' + \
                     df['year_of_publication'].astype(str)
    
    # Vectorize features using TF-IDF
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(df['features'])
    
    # Compute cosine similarity matrix
    cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
    return df, cosine_sim

# Get recommendations
def get_recommendations(query_title=None, query_author=None, query_genre=None, query_year=None, df=None, cosine_sim=None):
    if df is None or cosine_sim is None:
        df, cosine_sim = build_recommendation_model()
    
    # Create a query string
    query = ' '.join(filter(None, [
        query_title or '',
        query_author or '',
        query_genre or '',
        str(query_year) if query_year else ''
    ]))
    
    # Vectorize query
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf.fit(df['features'])  # Fit on original data
    query_vec = tfidf.transform([query])
    
    # Compute similarity with all books
    sim_scores = cosine_similarity(query_vec, tfidf.transform(df['features']))[0]
    
    # Get top 5 similar books
    sim_indices = sim_scores.argsort()[-5:][::-1]
    recommendations = df.iloc[sim_indices][['title', 'author', 'genre', 'year_of_publication']].to_dict('records')
    return recommendations

# API endpoint for recommendations
@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    title = data.get('title')
    author = data.get('author')
    genre = data.get('genre')
    year = data.get('year')
    
    recommendations = get_recommendations(title, author, genre, year)
    return jsonify({'recommendations': recommendations})

if __name__ == '__main__':
    app.run(port=5000, debug=True)