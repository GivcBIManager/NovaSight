#!/bin/bash
# =============================================================================
# NovaSight Security Scanning Script
# =============================================================================
# This script runs comprehensive security scans including:
# - SAST (Static Application Security Testing)
# - Dependency vulnerability scanning
# - Container scanning
# - Secret detection
# - DAST (Dynamic Application Security Testing) - optional
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${PROJECT_ROOT}/security/reports"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Timestamp for reports
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}     NovaSight Security Scanning Suite     ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Timestamp: $(date)"
echo "Reports directory: $REPORTS_DIR"
echo ""

# Track scan results
SCAN_PASSED=true

# =============================================================================
# 1. SAST - Static Application Security Testing
# =============================================================================

run_bandit() {
    echo -e "${YELLOW}[1/6] Running Bandit (Python SAST)...${NC}"
    
    if command -v bandit &> /dev/null; then
        cd "$PROJECT_ROOT"
        
        # Run Bandit with configuration
        bandit -r backend/app \
            -f json \
            -o "$REPORTS_DIR/bandit_${TIMESTAMP}.json" \
            --configfile .bandit \
            || true
        
        # Also generate HTML report
        bandit -r backend/app \
            -f html \
            -o "$REPORTS_DIR/bandit_${TIMESTAMP}.html" \
            --configfile .bandit \
            || true
        
        # Summary output
        bandit -r backend/app -f txt --configfile .bandit 2>&1 | tail -20
        
        echo -e "${GREEN}✓ Bandit scan complete${NC}"
    else
        echo -e "${RED}✗ Bandit not installed. Run: pip install bandit${NC}"
        SCAN_PASSED=false
    fi
    echo ""
}

run_semgrep() {
    echo -e "${YELLOW}[2/6] Running Semgrep...${NC}"
    
    if command -v semgrep &> /dev/null; then
        cd "$PROJECT_ROOT"
        
        semgrep --config auto \
            backend/app \
            --sarif \
            -o "$REPORTS_DIR/semgrep_${TIMESTAMP}.sarif" \
            || true
        
        echo -e "${GREEN}✓ Semgrep scan complete${NC}"
    else
        echo -e "${YELLOW}⚠ Semgrep not installed. Run: pip install semgrep${NC}"
    fi
    echo ""
}

# =============================================================================
# 2. Dependency Vulnerability Scanning
# =============================================================================

run_dependency_scan() {
    echo -e "${YELLOW}[3/6] Running Dependency Scans...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Python dependencies with pip-audit
    if command -v pip-audit &> /dev/null; then
        echo "  Scanning Python dependencies..."
        pip-audit -r backend/requirements.txt \
            --format json \
            > "$REPORTS_DIR/pip_audit_${TIMESTAMP}.json" 2>&1 \
            || true
        
        # Human-readable output
        pip-audit -r backend/requirements.txt || true
        echo ""
    else
        echo -e "${YELLOW}  ⚠ pip-audit not installed. Run: pip install pip-audit${NC}"
    fi
    
    # Python dependencies with safety
    if command -v safety &> /dev/null; then
        echo "  Running Safety check..."
        safety check -r backend/requirements.txt \
            --output json \
            > "$REPORTS_DIR/safety_${TIMESTAMP}.json" 2>&1 \
            || true
    fi
    
    # Node.js dependencies
    if [ -f "frontend/package.json" ]; then
        echo "  Scanning Node.js dependencies..."
        cd frontend
        npm audit --json > "$REPORTS_DIR/npm_audit_${TIMESTAMP}.json" 2>&1 || true
        npm audit || true
        cd "$PROJECT_ROOT"
    fi
    
    echo -e "${GREEN}✓ Dependency scans complete${NC}"
    echo ""
}

# =============================================================================
# 3. Secret Scanning
# =============================================================================

run_secret_scan() {
    echo -e "${YELLOW}[4/6] Running Secret Scans...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Gitleaks
    if command -v gitleaks &> /dev/null; then
        echo "  Running Gitleaks..."
        gitleaks detect \
            --source . \
            --report-format json \
            --report-path "$REPORTS_DIR/gitleaks_${TIMESTAMP}.json" \
            || true
        
        echo -e "${GREEN}✓ Gitleaks scan complete${NC}"
    else
        echo -e "${YELLOW}  ⚠ Gitleaks not installed${NC}"
    fi
    
    # TruffleHog (if available)
    if command -v trufflehog &> /dev/null; then
        echo "  Running TruffleHog..."
        trufflehog filesystem . \
            --json \
            > "$REPORTS_DIR/trufflehog_${TIMESTAMP}.json" 2>&1 \
            || true
    fi
    
    echo ""
}

# =============================================================================
# 4. Container Scanning
# =============================================================================

run_container_scan() {
    echo -e "${YELLOW}[5/6] Running Container Scans...${NC}"
    
    cd "$PROJECT_ROOT"
    
    if command -v trivy &> /dev/null; then
        # Scan backend Dockerfile
        if [ -f "backend/Dockerfile" ]; then
            echo "  Building and scanning backend container..."
            docker build -t novasight-backend:scan ./backend 2>/dev/null || true
            
            trivy image novasight-backend:scan \
                --format sarif \
                -o "$REPORTS_DIR/trivy_backend_${TIMESTAMP}.sarif" \
                --severity CRITICAL,HIGH \
                || true
            
            # Also generate table output
            trivy image novasight-backend:scan \
                --severity CRITICAL,HIGH \
                || true
        fi
        
        # Scan frontend Dockerfile
        if [ -f "docker/frontend/Dockerfile" ]; then
            echo "  Building and scanning frontend container..."
            docker build -t novasight-frontend:scan ./docker/frontend 2>/dev/null || true
            
            trivy image novasight-frontend:scan \
                --format sarif \
                -o "$REPORTS_DIR/trivy_frontend_${TIMESTAMP}.sarif" \
                --severity CRITICAL,HIGH \
                || true
        fi
        
        # Scan filesystem for vulnerabilities in configs
        echo "  Scanning filesystem configuration..."
        trivy fs . \
            --format sarif \
            -o "$REPORTS_DIR/trivy_fs_${TIMESTAMP}.sarif" \
            --severity CRITICAL,HIGH \
            || true
        
        echo -e "${GREEN}✓ Container scans complete${NC}"
    else
        echo -e "${YELLOW}  ⚠ Trivy not installed. Install from: https://aquasecurity.github.io/trivy/${NC}"
    fi
    
    echo ""
}

# =============================================================================
# 5. DAST - Dynamic Application Security Testing (Optional)
# =============================================================================

run_dast() {
    echo -e "${YELLOW}[6/6] Running DAST Scans...${NC}"
    
    # Check if services are running
    if curl -s http://localhost:5000/api/v1/health > /dev/null 2>&1; then
        echo "  Backend service detected, running ZAP scan..."
        
        if command -v docker &> /dev/null; then
            # Run ZAP in Docker
            docker run --rm \
                -v "$PROJECT_ROOT/security/zap:/zap/wrk:rw" \
                -v "$REPORTS_DIR:/zap/reports:rw" \
                --network host \
                -t owasp/zap2docker-stable \
                zap.sh -cmd -autorun /zap/wrk/zap-config.yaml \
                || true
            
            echo -e "${GREEN}✓ ZAP DAST scan complete${NC}"
        else
            echo -e "${YELLOW}  ⚠ Docker not available for ZAP scan${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ Backend not running at localhost:5000. Skipping DAST.${NC}"
        echo "     Start the backend with: docker-compose up -d backend"
    fi
    
    echo ""
}

# =============================================================================
# 6. Run Python Security Tests
# =============================================================================

run_security_tests() {
    echo -e "${YELLOW}Running Security Test Suite...${NC}"
    
    cd "$PROJECT_ROOT"
    
    if command -v pytest &> /dev/null; then
        pytest backend/tests/security/ \
            -v \
            --tb=short \
            --junitxml="$REPORTS_DIR/security_tests_${TIMESTAMP}.xml" \
            || true
        
        echo -e "${GREEN}✓ Security tests complete${NC}"
    else
        echo -e "${YELLOW}⚠ pytest not installed${NC}"
    fi
    
    echo ""
}

# =============================================================================
# Generate Summary Report
# =============================================================================

generate_summary() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}           Security Scan Summary           ${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "Scan completed at: $(date)"
    echo ""
    echo "Reports generated in: $REPORTS_DIR"
    echo ""
    echo "Report files:"
    ls -la "$REPORTS_DIR"/*_${TIMESTAMP}.* 2>/dev/null || echo "  No reports generated"
    echo ""
    
    # Create summary markdown
    cat > "$REPORTS_DIR/SUMMARY_${TIMESTAMP}.md" << EOF
# NovaSight Security Scan Summary

**Date:** $(date)
**Timestamp:** ${TIMESTAMP}

## Scans Performed

- [ ] Bandit (Python SAST)
- [ ] Semgrep
- [ ] pip-audit / Safety (Python dependencies)
- [ ] npm audit (Node.js dependencies)
- [ ] Gitleaks (Secret scanning)
- [ ] Trivy (Container scanning)
- [ ] ZAP (DAST) - if services running
- [ ] Security test suite

## Reports Generated

$(ls "$REPORTS_DIR"/*_${TIMESTAMP}.* 2>/dev/null | sed 's/^/- /' || echo "No reports generated")

## Next Steps

1. Review all generated reports
2. Prioritize findings by severity (Critical > High > Medium > Low)
3. Create tickets for confirmed vulnerabilities
4. Update dependencies with known vulnerabilities
5. Fix code issues flagged by SAST

EOF

    echo -e "${GREEN}Summary report generated: $REPORTS_DIR/SUMMARY_${TIMESTAMP}.md${NC}"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Parse command line arguments
    SKIP_DAST=false
    QUICK_SCAN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-dast)
                SKIP_DAST=true
                shift
                ;;
            --quick)
                QUICK_SCAN=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-dast    Skip DAST scanning (ZAP)"
                echo "  --quick        Quick scan (SAST only)"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run scans
    run_bandit
    run_semgrep
    
    if [ "$QUICK_SCAN" = false ]; then
        run_dependency_scan
        run_secret_scan
        run_container_scan
        
        if [ "$SKIP_DAST" = false ]; then
            run_dast
        fi
        
        run_security_tests
    fi
    
    # Generate summary
    generate_summary
    
    echo ""
    if [ "$SCAN_PASSED" = true ]; then
        echo -e "${GREEN}✓ Security scans completed successfully${NC}"
    else
        echo -e "${RED}✗ Some scans failed or had critical findings${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
