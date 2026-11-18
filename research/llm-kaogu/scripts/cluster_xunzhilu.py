"""
Extract features from xunzhilu images using pre-trained ResNet18,
then cluster with KMeans to discover visual groups.
"""
import os, json, torch, numpy as np
from PIL import Image
from torchvision import transforms, models
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from collections import defaultdict

IMG_DIR = 'data/r2-images/xunzhilu-v2/images'
N_CLUSTERS = 8
BATCH_SIZE = 32

# Load pre-trained ResNet18 (use existing model if available)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = models.resnet18(weights='IMAGENET1K_V1')
model.fc = torch.nn.Identity()  # Remove classification head -> 512-d features
model = model.to(device).eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Extract features
files = sorted([f for f in os.listdir(IMG_DIR) if f.endswith('.jpg')])
print(f'Extracting features from {len(files)} images...')

features = []
valid_files = []
for i in range(0, len(files), BATCH_SIZE):
    batch_files = files[i:i+BATCH_SIZE]
    batch_tensors = []
    for f in batch_files:
        try:
            img = Image.open(os.path.join(IMG_DIR, f)).convert('RGB')
            batch_tensors.append(transform(img))
            valid_files.append(f)
        except Exception as e:
            print(f'  Skip {f}: {e}')
    
    if batch_tensors:
        batch = torch.stack(batch_tensors).to(device)
        with torch.no_grad():
            feat = model(batch).cpu().numpy()
        features.append(feat)
    
    if (i + BATCH_SIZE) % 200 == 0:
        print(f'  Processed {min(i+BATCH_SIZE, len(files))}/{len(files)}')

features = np.vstack(features)
print(f'Feature shape: {features.shape}')

# Cluster
print(f'Clustering into {N_CLUSTERS} groups...')
kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
labels = kmeans.fit_predict(features)

# Group results by record ID
record_clusters = defaultdict(list)
for f, label in zip(valid_files, labels):
    rec_id = f.split('_')[0]  # rec-XXXX
    record_clusters[rec_id].append(int(label))

# For each record, use majority vote for cluster assignment
record_labels = {}
for rec_id, cluster_list in record_clusters.items():
    from collections import Counter
    majority = Counter(cluster_list).most_common(1)[0][0]
    record_labels[rec_id] = majority

# Save results
results = {
    'n_images': len(valid_files),
    'n_records': len(record_labels),
    'n_clusters': N_CLUSTERS,
    'cluster_sizes': {int(k): int(v) for k, v in zip(*np.unique(labels, return_counts=True))},
    'record_labels': record_labels,
    'image_labels': {f: int(l) for f, l in zip(valid_files, labels)}
}

with open('data/xunzhilu_clusters.json', 'w') as f:
    json.dump(results, f, indent=2)

# Print summary
print(f'\n=== Clustering Results ===')
print(f'Total images: {len(valid_files)}')
print(f'Total records: {len(record_labels)}')
print(f'\nCluster sizes:')
for cid in sorted(results['cluster_sizes'].keys()):
    count = results['cluster_sizes'][cid]
    recs = [r for r, c in record_labels.items() if c == cid]
    print(f'  Cluster {cid}: {count} images, {len(recs)} records')
    print(f'    Sample records: {recs[:5]}')

# PCA for visualization
pca = PCA(n_components=2)
coords = pca.fit_transform(features)
pca_data = {f: [float(x), float(y)] for f, x, y in zip(valid_files, coords[:, 0], coords[:, 1])}
with open('data/xunzhilu_pca.json', 'w') as f:
    json.dump(pca_data, f)

print(f'\nSaved: data/xunzhilu_clusters.json, data/xunzhilu_pca.json')
