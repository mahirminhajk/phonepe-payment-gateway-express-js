import express from "express";
import axios from "axios";
import { randomUUID } from "node:crypto";
import sha256 from "sha256";

const PORT = process.env.PORT || 3001;

const app = express();

app.get("/", (req, res) => {
    res.send("PhonePe payment gateway");
});

app.get("/pay", (req, res) => {
    //* https://developer.phonepe.com/v1/reference/pay-api-1
    
    const payEndpoint = "/pg/v1/pay"

    const merchantTransactionId = randomUUID().toString();
    const userId = 1234

    const payload = {
        "merchantId": process.env.PHONEPE_MERCHANT_ID,
        "merchantTransactionId": merchantTransactionId,
        "merchantUserId": userId,
        "amount": 10000, // 100 INR
        "redirectUrl": `http://localhost:3001/redirect-url/${merchantTransactionId}`, //* after payment, user will be redirected to this url
        "redirectMode": "REDIRECT",
        "callbackUrl": "https://webhook.site/callback-url",
        "mobileNumber": "9999999999",
        "paymentInstrument": {
            "type": "PAY_PAGE"
        }
    }

    // SHA256(base64 encoded payload + “/pg/v1/pay” + salt key) + ### + salt index
    const bufferObj = Buffer.from(JSON.stringify(payload),"utf-8");
    const base64Payload = bufferObj.toString("base64");
    const xVerify = sha256(base64Payload + payEndpoint + process.env.PHONEPE_SALT_KEY) + "###" + process.env.PHONEPE_SALT_INDEX;


    const options = {
        method: 'post',
        url: `${process.env.PHONEPE_HOST_URL}${payEndpoint}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify
        },
        data: {
            request: base64Payload
        }
    };
    axios
        .request(options)
        .then(function (response) {
            console.log(response.data);
            res.send(response.data);
        })
        .catch(function (error) {
            console.error(error);
        });
});

app.get("/redirect-url/:merchantTransactionId", (req, res) => {
    //* https://developer.phonepe.com/v1/reference/check-status-api-1

    
    const { merchantTransactionId } = req.params;
    const statusEndPoint = `/pg/v1/status/${process.env.PHONEPE_MERCHANT_ID}/${merchantTransactionId}`

    //* SHA256(“/pg/v1/status/{merchantId}/{merchantTransactionId}” + saltKey) + “###” + saltIndex
    const xVerify = sha256(statusEndPoint + process.env.PHONEPE_SALT_KEY) + "###" + process.env.PHONEPE_SALT_INDEX;

    const options = {
        method: 'get',
        url: `${process.env.PHONEPE_HOST_URL}${statusEndPoint}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            "X-VERIFY": xVerify,
            "X-MERCHANT-ID": process.env.PHONEPE_MERCHANT_ID,
        },

    };
    axios
        .request(options)
        .then(function (response) {
            console.log(response.data);
            res.send(response.data);
        })
        .catch(function (error) {
            console.error(error);
        });

});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
