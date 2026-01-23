#!/bin/bash
# Setup script for Grafana configuration files
# This script moves the configuration files to the correct locations

set -e

echo "Setting up Grafana configuration files..."

# Create subdirectories in provisioning
echo "Creating provisioning subdirectories..."
sudo mkdir -p /home/zimele-dubazana/Zekka/grafana/provisioning/datasources
sudo mkdir -p /home/zimele-dubazana/Zekka/grafana/provisioning/dashboards

# Move datasource configuration
echo "Moving datasource configuration..."
sudo mv /home/zimele-dubazana/Zekka/datasource.yml /home/zimele-dubazana/Zekka/grafana/provisioning/datasources/

# Move dashboard provisioning configuration
echo "Moving dashboard configuration..."
sudo mv /home/zimele-dubazana/Zekka/dashboard.yml /home/zimele-dubazana/Zekka/grafana/provisioning/dashboards/

# Copy the dashboard JSON to the dashboards directory
echo "Copying dashboard JSON..."
sudo cp /home/zimele-dubazana/Zekka/grafana/zekka-dashboard.json /home/zimele-dubazana/Zekka/grafana/dashboards/

# Fix permissions
echo "Fixing permissions..."
sudo chown -R zimele-dubazana:zimele-dubazana /home/zimele-dubazana/Zekka/grafana/

echo "Done! Grafana configuration files are now in place."
echo ""
echo "File locations:"
echo "  - /home/zimele-dubazana/Zekka/grafana/provisioning/datasources/datasource.yml"
echo "  - /home/zimele-dubazana/Zekka/grafana/provisioning/dashboards/dashboard.yml"
echo "  - /home/zimele-dubazana/Zekka/grafana/dashboards/zekka-dashboard.json"
