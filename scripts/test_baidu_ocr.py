"""Test Baidu OCR image capabilities."""
import os
import requests
import base64
import json


def get_access_token():
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": os.environ["BAIDU_OCR_API_KEY"],
        "client_secret": os.environ["BAIDU_OCR_SECRET_KEY"],
    }
    resp = requests.post(url, params=params)
    resp.raise_for_status()
    return resp.json()["access_token"]


def ocr_general_basic(token, image_path):
    """通用文字识别（标准版）"""
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={token}"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read())
    resp = requests.post(url, data={"image": img_base64})
    resp.raise_for_status()
    return resp.json()


def ocr_general_enhanced(token, image_path):
    """通用文字识别（高精度版）"""
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={token}"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read())
    resp = requests.post(url, data={"image": img_base64, "language_type": "CHN_ENG"})
    resp.raise_for_status()
    return resp.json()


def ocr_table(token, image_path):
    """表格识别"""
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/table?access_token={token}"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read())
    resp = requests.post(url, data={"image": img_base64})
    resp.raise_for_status()
    return resp.json()


def ocr_accurate(token, image_path):
    """通用文字识别（高精度含位置版）"""
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/accurate?access_token={token}"
    with open(image_path, "rb") as f:
        img_base64 = base64.b64encode(f.read())
    resp = requests.post(url, data={"image": img_base64})
    resp.raise_for_status()
    return resp.json()


def list_available_apis(token):
    """查询可用的OCR API"""
    apis = {
        "general_basic": "通用文字识别（标准版）",
        "general": "通用文字识别（标准含位置版）",
        "accurate_basic": "通用文字识别（高精度版）",
        "accurate": "通用文字识别（高精度含位置版）",
        "table": "表格识别",
        "numbers": "数字识别",
        "webimage": "网络图片文字识别",
        "idcard": "身份证识别",
        "business_license": "营业执照识别",
        "bankcard": "银行卡识别",
        "receipt": "通用票据识别",
        "vat_invoice": "增值税发票识别",
        "qrcode": "二维码识别",
        "Handwriting": "手写文字识别",
    }
    print("可用的Baidu OCR API:")
    for code, name in apis.items():
        print(f"  - {code}: {name}")


if __name__ == "__main__":
    token = get_access_token()
    print(f"Access token obtained: {token[:20]}...")
    list_available_apis(token)

    # Test with a sample image if provided
    import sys
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        print(f"\nTesting with: {image_path}")

        # Try general basic OCR
        print("\n=== General Basic OCR ===")
        result = ocr_general_basic(token, image_path)
        if "words_result" in result:
            for item in result["words_result"]:
                print(f"  {item['words']}")
        else:
            print(f"  Error: {result}")

        # Try table OCR
        print("\n=== Table OCR ===")
        result = ocr_table(token, image_path)
        print(json.dumps(result, indent=2, ensure_ascii=False)[:1000])
    else:
        print("\nUsage: python test_baidu_ocr.py <image_path>")
