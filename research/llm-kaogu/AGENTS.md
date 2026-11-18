
## External Documentation References

### Baidu OCR API
- **URL**: https://cloud.baidu.com/doc/OCR/s/1k3h7y3db
- **Usage**: 考古报告PDF文字识别，提取墓葬信息
- **API Key**: 见 scripts/ocr_pipeline.py 中的 BAIDU_API_KEY
- **Main endpoints**:
  - 通用文字识别: `/rest/2.0/ocr/v1/general_basic`
  - 高精度版: `/rest/2.0/ocr/v1/accurate_basic`
  - 表格识别: `/rest/2.0/ocr/v1/table`
