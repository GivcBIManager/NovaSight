"""
NovaSight Dagster Resources — Spark
====================================

Spark resource for PySpark job execution with two modes:
1. SparkResource - Static config from environment/Dagster config
2. DynamicSparkResource - Dynamic global config from database

Spark is always global (not per-tenant) as it's a shared compute resource.
Configuration can be updated via the admin UI with immediate effect.
"""

from dagster import ConfigurableResource, InitResourceContext
from typing import Optional, Dict, Any, TYPE_CHECKING
import logging

# PySpark may not be installed in all environments
# Import conditionally - actual Spark jobs run via spark-submit
try:
    from pyspark.sql import SparkSession
    PYSPARK_AVAILABLE = True
except ImportError:
    SparkSession = None  # type: ignore
    PYSPARK_AVAILABLE = False

logger = logging.getLogger(__name__)


class SparkResource(ConfigurableResource):
    """
    Dagster resource for Apache Spark (static config).
    
    Provides SparkSession for asset execution with configuration
    from environment variables or Dagster config.
    """
    
    master: str = "spark://spark-master:7077"
    app_name: str = "NovaSight"
    config: Optional[dict] = None

    def get_session(self):
        """Get or create a SparkSession."""
        if not PYSPARK_AVAILABLE:
            raise RuntimeError(
                "PySpark is not installed. Use submit_job() for spark-submit or "
                "install pyspark: pip install pyspark"
            )
        
        builder = SparkSession.builder \
            .appName(self.app_name) \
            .master(self.master)
        
        # Apply additional config if provided
        if self.config:
            for key, value in self.config.items():
                builder = builder.config(key, value)
        
        session = builder.getOrCreate()
        logger.info(f"SparkSession created: {self.app_name} -> {self.master}")
        return session

    def submit_job(
        self,
        app_path: str,
        app_args: list = None,
        spark_config: dict = None,
    ) -> dict:
        """Submit a Spark application."""
        import subprocess
        
        cmd = [
            "spark-submit",
            "--master", self.master,
        ]
        
        # Add spark config
        if spark_config:
            for key, value in spark_config.items():
                cmd.extend(["--conf", f"{key}={value}"])
        
        cmd.append(app_path)
        
        if app_args:
            cmd.extend(app_args)
        
        logger.info(f"Submitting Spark job: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )
        
        return {
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0,
        }


class DynamicSparkResource(ConfigurableResource):
    """
    Dagster resource for Apache Spark with dynamic configuration.
    
    Fetches Spark configuration from the database, allowing
    administrators to update Spark settings via the UI with
    immediate effect on new jobs.
    
    Spark is always a global resource (not per-tenant) as it's
    a shared compute cluster.
    
    Usage:
        @asset
        def my_spark_asset(context, spark: DynamicSparkResource):
            session = spark.get_session()
            df = session.read.parquet("s3://...")
    """
    
    # Default settings (used if database config unavailable)
    fallback_master: str = "spark://spark-master:7077"
    fallback_app_name: str = "NovaSight"
    
    def _get_config(self) -> "SparkConfig":
        """Fetch Spark configuration from database."""
        try:
            from app.platform.infrastructure import InfrastructureConfigProvider
            
            provider = InfrastructureConfigProvider()
            return provider.get_spark_config()
        except Exception as e:
            logger.warning("Failed to get dynamic Spark config: %s", e)
            return None
    
    def get_session(
        self,
        app_name: Optional[str] = None,
        additional_config: Optional[Dict[str, str]] = None,
    ):
        """
        Get or create a SparkSession with dynamic configuration.
        
        Args:
            app_name: Override application name
            additional_config: Additional Spark configs to apply
        
        Returns:
            SparkSession instance
        """
        if not PYSPARK_AVAILABLE:
            raise RuntimeError(
                "PySpark is not installed. Use submit_job() for spark-submit or "
                "install pyspark: pip install pyspark"
            )
        
        config = self._get_config()
        
        if config:
            master_url = config.master_url
            driver_memory = config.driver_memory
            executor_memory = config.executor_memory
            executor_cores = str(config.executor_cores)
            dynamic_allocation = config.dynamic_allocation
            min_executors = str(config.min_executors)
            max_executors = str(config.max_executors)
            stored_configs = config.additional_configs
            
            logger.info(
                "Using Spark config '%s': %s",
                config.name, master_url,
            )
        else:
            master_url = self.fallback_master
            driver_memory = "2g"
            executor_memory = "2g"
            executor_cores = "2"
            dynamic_allocation = True
            min_executors = "1"
            max_executors = "10"
            stored_configs = {}
            
            logger.warning(
                "Using fallback Spark config: %s", master_url
            )
        
        builder = SparkSession.builder \
            .appName(app_name or self.fallback_app_name) \
            .master(master_url) \
            .config("spark.driver.memory", driver_memory) \
            .config("spark.executor.memory", executor_memory) \
            .config("spark.executor.cores", executor_cores)
        
        if dynamic_allocation:
            builder = builder \
                .config("spark.dynamicAllocation.enabled", "true") \
                .config("spark.dynamicAllocation.minExecutors", min_executors) \
                .config("spark.dynamicAllocation.maxExecutors", max_executors)
        
        # Apply stored additional configs
        for key, value in stored_configs.items():
            builder = builder.config(key, str(value))
        
        # Apply runtime additional configs
        if additional_config:
            for key, value in additional_config.items():
                builder = builder.config(key, str(value))
        
        session = builder.getOrCreate()
        logger.info("SparkSession created with dynamic config")
        return session
    
    def submit_job(
        self,
        app_path: str,
        app_args: Optional[list] = None,
        spark_config: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Submit a Spark application using dynamic configuration.
        
        Args:
            app_path: Path to the Spark application
            app_args: Arguments to pass to the application
            spark_config: Additional Spark configuration
        
        Returns:
            Dict with return_code, stdout, stderr, success
        """
        import subprocess
        
        config = self._get_config()
        master_url = config.master_url if config else self.fallback_master
        
        cmd = [
            "spark-submit",
            "--master", master_url,
        ]
        
        # Add dynamic config settings
        if config:
            cmd.extend(["--driver-memory", config.driver_memory])
            cmd.extend(["--executor-memory", config.executor_memory])
            cmd.extend(["--executor-cores", str(config.executor_cores)])
            
            # Add stored configs
            for key, value in config.additional_configs.items():
                cmd.extend(["--conf", f"{key}={value}"])
        
        # Add runtime spark config
        if spark_config:
            for key, value in spark_config.items():
                cmd.extend(["--conf", f"{key}={value}"])
        
        cmd.append(app_path)
        
        if app_args:
            cmd.extend(app_args)
        
        logger.info("Submitting Spark job with dynamic config: %s", " ".join(cmd))
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )
        
        return {
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "success": result.returncode == 0,
        }
    
    @property
    def master_url(self) -> str:
        """Get current Spark master URL from config."""
        config = self._get_config()
        return config.master_url if config else self.fallback_master
