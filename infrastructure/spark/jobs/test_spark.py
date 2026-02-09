"""Simple Spark test job."""
from pyspark.sql import SparkSession

def main():
    spark = SparkSession.builder \
        .appName("TestSparkJob") \
        .getOrCreate()
    
    print("=" * 50)
    print("Spark Session Created Successfully!")
    print(f"Spark Version: {spark.version}")
    print(f"App Name: {spark.sparkContext.appName}")
    print("=" * 50)
    
    # Create a simple DataFrame
    data = [("Alice", 1), ("Bob", 2), ("Charlie", 3)]
    df = spark.createDataFrame(data, ["name", "id"])
    
    print("\nTest DataFrame:")
    df.show()
    
    print(f"Row count: {df.count()}")
    print("Test completed successfully!")
    
    spark.stop()

if __name__ == "__main__":
    main()
