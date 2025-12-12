"""
Create Architecture Diagram
Run this to generate an architecture visualization
"""

try:
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
    
    fig, ax = plt.subplots(1, 1, figsize=(14, 10))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # Title
    ax.text(5, 9.5, 'SWFM ML Service - Production Architecture', 
            ha='center', va='top', fontsize=16, fontweight='bold')
    
    # Client Layer
    client_box = FancyBboxPatch((0.5, 7.5), 2, 1.2, 
                                boxstyle="round,pad=0.1", 
                                edgecolor='blue', facecolor='lightblue', linewidth=2)
    ax.add_patch(client_box)
    ax.text(1.5, 8.3, 'Clients', ha='center', fontweight='bold')
    ax.text(1.5, 8.0, 'Web Browser', ha='center', fontsize=9)
    ax.text(1.5, 7.8, 'Python Script', ha='center', fontsize=9)
    ax.text(1.5, 7.6, 'Mobile App', ha='center', fontsize=9)
    
    # API Gateway
    api_box = FancyBboxPatch((3.5, 7.5), 3, 1.2,
                            boxstyle="round,pad=0.1",
                            edgecolor='green', facecolor='lightgreen', linewidth=2)
    ax.add_patch(api_box)
    ax.text(5, 8.3, 'FastAPI Application', ha='center', fontweight='bold')
    ax.text(5, 8.0, 'Port 8000', ha='center', fontsize=9)
    ax.text(5, 7.8, '/api/v1/*', ha='center', fontsize=9)
    
    # API Routers
    routers_y = 5.8
    
    # Health Router
    health_box = FancyBboxPatch((0.5, routers_y), 1.8, 0.8,
                               boxstyle="round,pad=0.05",
                               edgecolor='purple', facecolor='lavender', linewidth=1.5)
    ax.add_patch(health_box)
    ax.text(1.4, routers_y+0.5, 'Health', ha='center', fontweight='bold', fontsize=10)
    ax.text(1.4, routers_y+0.2, '/health', ha='center', fontsize=8)
    
    # Data Router
    data_box = FancyBboxPatch((2.8, routers_y), 1.8, 0.8,
                             boxstyle="round,pad=0.05",
                             edgecolor='orange', facecolor='lightyellow', linewidth=1.5)
    ax.add_patch(data_box)
    ax.text(3.7, routers_y+0.5, 'Data Router', ha='center', fontweight='bold', fontsize=10)
    ax.text(3.7, routers_y+0.2, '/data/*', ha='center', fontsize=8)
    
    # Models Router
    models_box = FancyBboxPatch((5.1, routers_y), 1.8, 0.8,
                               boxstyle="round,pad=0.05",
                               edgecolor='brown', facecolor='wheat', linewidth=1.5)
    ax.add_patch(models_box)
    ax.text(6.0, routers_y+0.5, 'ML Models', ha='center', fontweight='bold', fontsize=10)
    ax.text(6.0, routers_y+0.2, '/models/*', ha='center', fontsize=8)
    
    # Predict Router
    predict_box = FancyBboxPatch((7.4, routers_y), 1.8, 0.8,
                                boxstyle="round,pad=0.05",
                                edgecolor='red', facecolor='mistyrose', linewidth=1.5)
    ax.add_patch(predict_box)
    ax.text(8.3, routers_y+0.5, 'Predictions', ha='center', fontweight='bold', fontsize=10)
    ax.text(8.3, routers_y+0.2, '/predict/*', ha='center', fontsize=8)
    
    # Services Layer
    service_box = FancyBboxPatch((2.5, 4.0), 5, 1.0,
                                boxstyle="round,pad=0.1",
                                edgecolor='darkgreen', facecolor='honeydew', linewidth=2)
    ax.add_patch(service_box)
    ax.text(5, 4.7, 'Services Layer (Business Logic)', ha='center', fontweight='bold')
    ax.text(3.5, 4.3, 'DataMergeService', ha='center', fontsize=9)
    ax.text(5.0, 4.3, 'AnalysisService', ha='center', fontsize=9)
    ax.text(6.5, 4.3, 'PredictionService', ha='center', fontsize=9)
    
    # Data Sources
    sources_y = 2.2
    
    # Supabase
    supabase_box = FancyBboxPatch((1.0, sources_y), 2.5, 0.8,
                                 boxstyle="round,pad=0.05",
                                 edgecolor='darkblue', facecolor='aliceblue', linewidth=2)
    ax.add_patch(supabase_box)
    ax.text(2.25, sources_y+0.5, 'Supabase', ha='center', fontweight='bold', fontsize=10)
    ax.text(2.25, sources_y+0.2, 'Stations & Weather', ha='center', fontsize=8)
    
    # Open-Meteo
    meteo_box = FancyBboxPatch((4.0, sources_y), 2.5, 0.8,
                              boxstyle="round,pad=0.05",
                              edgecolor='darkorange', facecolor='papayawhip', linewidth=2)
    ax.add_patch(meteo_box)
    ax.text(5.25, sources_y+0.5, 'Open-Meteo', ha='center', fontweight='bold', fontsize=10)
    ax.text(5.25, sources_y+0.2, 'Weather API', ha='center', fontsize=8)
    
    # MLflow
    mlflow_box = FancyBboxPatch((7.0, sources_y), 2.0, 0.8,
                               boxstyle="round,pad=0.05",
                               edgecolor='darkred', facecolor='seashell', linewidth=2)
    ax.add_patch(mlflow_box)
    ax.text(8.0, sources_y+0.5, 'MLflow', ha='center', fontweight='bold', fontsize=10)
    ax.text(8.0, sources_y+0.2, 'Model Registry', ha='center', fontsize=8)
    
    # Arrows
    arrow_props = dict(arrowstyle='->', lw=2, color='gray')
    
    # Client to API
    ax.annotate('', xy=(3.5, 8.1), xytext=(2.5, 8.1), arrowprops=arrow_props)
    
    # API to Routers
    ax.annotate('', xy=(1.4, 6.6), xytext=(4.5, 7.5), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(3.7, 6.6), xytext=(5.0, 7.5), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(6.0, 6.6), xytext=(5.5, 7.5), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(8.3, 6.6), xytext=(6.0, 7.5), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    
    # Routers to Services
    ax.annotate('', xy=(3.5, 5.0), xytext=(3.7, 5.8), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(5.0, 5.0), xytext=(6.0, 5.8), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(6.5, 5.0), xytext=(8.3, 5.8), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    
    # Services to Data Sources
    ax.annotate('', xy=(2.25, 3.0), xytext=(3.5, 4.0), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(5.25, 3.0), xytext=(5.0, 4.0), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    ax.annotate('', xy=(8.0, 3.0), xytext=(6.5, 4.0), arrowprops=dict(arrowstyle='->', lw=1.5, color='gray'))
    
    # Configuration box
    config_box = FancyBboxPatch((0.3, 0.3), 1.5, 0.7,
                               boxstyle="round,pad=0.05",
                               edgecolor='gray', facecolor='whitesmoke', linewidth=1)
    ax.add_patch(config_box)
    ax.text(1.05, 0.8, 'Configuration', ha='center', fontweight='bold', fontsize=9)
    ax.text(1.05, 0.5, '.env', ha='center', fontsize=8)
    ax.text(1.05, 0.35, 'Settings', ha='center', fontsize=8)
    
    # Monitoring box
    monitor_box = FancyBboxPatch((8.2, 0.3), 1.5, 0.7,
                                boxstyle="round,pad=0.05",
                                edgecolor='gray', facecolor='whitesmoke', linewidth=1)
    ax.add_patch(monitor_box)
    ax.text(8.95, 0.8, 'Monitoring', ha='center', fontweight='bold', fontsize=9)
    ax.text(8.95, 0.5, 'Logs', ha='center', fontsize=8)
    ax.text(8.95, 0.35, 'Health', ha='center', fontsize=8)
    
    # Legend
    legend_y = 0.8
    ax.text(3.5, legend_y, 'Key Features:', fontweight='bold', fontsize=10)
    ax.text(3.5, legend_y-0.3, '• RESTful API with FastAPI', fontsize=8)
    ax.text(3.5, legend_y-0.5, '• Auto-generated docs (/docs)', fontsize=8)
    ax.text(5.5, legend_y-0.3, '• Async operations', fontsize=8)
    ax.text(5.5, legend_y-0.5, '• Docker ready', fontsize=8)
    ax.text(7.0, legend_y-0.3, '• Scalable design', fontsize=8)
    ax.text(7.0, legend_y-0.5, '• Production ready', fontsize=8)
    
    plt.tight_layout()
    plt.savefig('/home/nam/study/swfm/ml-service/architecture.png', dpi=300, bbox_inches='tight')
    print("✅ Architecture diagram saved to: ml-service/architecture.png")
    plt.show()

except ImportError:
    print("⚠️  matplotlib not installed. Install with: pip install matplotlib")
    print("Architecture diagram skipped.")
