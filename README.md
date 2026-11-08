# VaultEnc

VaultEnc, parolaları cihazda tutan ve kasayı AES-256-GCM ile şifreleyen bir Electron masaüstü uygulamasıdır. Ana parola veya çözülmüş kasa içeriği herhangi bir uzak servise gönderilmez.

## Güvenlik modeli

- Anahtar, PBKDF2-SHA-256 ile 600.000 tur kullanılarak türetilir.
- Her kasa için rastgele 32 bayt salt, her kayıt için rastgele 16 bayt IV kullanılır.
- Kasa `Documents/.vaultenc/vault.enc` konumunda şifreli olarak saklanır.
- Güncellemeler yalnızca `itsvarp/vaultenc` GitHub sürümlerinden HTTPS üzerinden kabul edilir.
- Ana parolanızı unutursanız kasa kurtarılamaz. Yedeklerinizi güvenli bir konumda tutun.

## Geliştirme

Gereksinimler: güncel Node.js LTS, npm ve Electron Forge'un platforma özgü derleme gereksinimleri.

```bash
npm ci
npm run lint
npm start
```

Dağıtım paketi oluşturmak için:

```bash
npm run make
```

## Gizlilik

Depoya `.env` dosyaları, sertifikalar, özel anahtarlar, `vault.enc` veya kasa yedekleri eklenmemelidir. İlgili kalıplar `.gitignore` içinde engellenmiştir.

## Lisans

MIT
