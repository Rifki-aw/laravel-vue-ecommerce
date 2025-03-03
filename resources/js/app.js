import "./bootstrap";
import "./loading.js";

import Alpine from "alpinejs";
import collapse from "@alpinejs/collapse";
// import { get, post } from "./http.js";
import { post, get, request } from "./http.js";

Alpine.plugin(collapse);

window.Alpine = Alpine;

document.addEventListener("alpine:init", async () => {
    Alpine.data("toast", () => ({
        visible: false,
        delay: 5000,
        percent: 0,
        interval: null,
        timeout: null,
        message: null,
        close() {
            this.visible = false;
            clearInterval(this.interval);
        },
        show(message) {
            this.visible = true;
            this.message = message;

            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }

            this.timeout = setTimeout(() => {
                this.visible = false;
                this.timeout = null;
            }, this.delay);
            const startDate = Date.now();
            const futureDate = Date.now() + this.delay;
            this.interval = setInterval(() => {
                const date = Date.now();
                this.percent =
                    ((date - startDate) * 100) / (futureDate - startDate);
                if (this.percent >= 100) {
                    clearInterval(this.interval);
                    this.interval = null;
                }
            }, 30);
        },
    }));

    // Pengelolaan item produk
    Alpine.data("productItem", (product) => {
        return {
            product, // Menyimpan data produk yang dierima sebagai parameter
            addToCart(quantity = 1) {
                // Fungsi untuk menambahkan item ke keranjang belanja
                post(this.product.addToCartUrl, { quantity }) // Kirim permintaan POST ke 'addToCartUrl' dgn jumlah item yang ditentukan
                    .then((result) => {
                        // Event 'cart-change' dengan jumlah item baru di keranjang
                        this.$dispatch("cart-change", { count: result.count });
                        // Event 'notify' untuk menampilkan pesan sukses
                        this.$dispatch("notify", {
                            message: "The item was added into the cart",
                        });
                    })
                    .catch((response) => {
                        console.log(response);
                    });
            },
            removeItemFromCart() {
                // Fungsi untuk menghapus item dari keranjang
                post(this.product.removeUrl).then((result) => {
                    this.$dispatch("notify", {
                        message: "The item was removed from cart",
                    });
                    this.$dispatch("cart-change", { count: result.count });
                    this.cartItems = this.cartItems.filter(
                        (p) => p.id !== product.id // Menghapus item dari daftar 'cartItems'
                    );
                });
            },
            changeQuantity() {
                post(this.product.updateQuantityUrl, {
                    quantity: product.quantity,
                }).then((result) => {
                    this.$dispatch("cart-change", { count: result.count });
                    this.$dispatch("notify", {
                        message: "The item quantity was updated",
                    });
                });
            },
        };
    });

    // Pengelolaan Provinsi dan Kota
    Alpine.data("provinceCity", () => ({
        listCity: [],
        getCity(event) {
            let provinceId = event.target.value;
            if (provinceId) {
                get("/cities?province_id=" + provinceId)
                    .then((data) => {
                        this.listCity = data;
                        // Mengupdate nilai dari select kota
                        document.getElementById("city").innerHTML = "";
                        let provinceName =
                            event.target.options[event.target.selectedIndex]
                                .text;
                        document.querySelector(
                            'input[name="province_name"]'
                        ).value = provinceName;

                        let option = document.createElement("option");
                        option.value = "";
                        option.text = "Select City";
                        document.getElementById("city").appendChild(option);
                        // loop untuk membuat opsi kota
                        data.forEach((city) => {
                            let option = document.createElement("option");
                            option.value = city.city_id;
                            option.text = city.city_name;
                            document.getElementById("city").appendChild(option);
                        });
                    })
                    .catch((error) => console.error(error));
            } else {
                this.listCity = [];
            }
        },
        updateCityName(event) {
            let cityName =
                event.target.options[event.target.selectedIndex].text;
            document.querySelector('input[name="city_name"]').value = cityName;
        },
    }));

    // Pengelolaan Kurir
    Alpine.data("payments", () => ({
        deliveryCost: "", // Biaya pengiriman
        deliveryService: "", // Jenis kurir
        subtotal: 0, // Subtotal barang
        total: 0, // Total keseluruhan
        isProcessing: false, // Status pemrosesan

        // Inisialisasi data
        async init() {
            // Parsing subtotal dari atribut 'x-subtotal'
            let subtotalString = this.$el
                .getAttribute("x-subtotal")
                .replace(".", "")
                .replace(",", ".");
            this.subtotal = parseFloat(subtotalString);
        },

        // Mengambil pengiriman berdasarkan pilihan
        async getDeliveryCost(event) {
            let deliveryValues = event.target.value.split("__");
            let deliveryCost = deliveryValues[0];
            let deliveryService = deliveryValues[1];
            if (deliveryCost === undefined || deliveryCost === "") {
                return;
            }

            let deliveryCostInt = parseFloat(deliveryCost);

            // Update state biaya dan layanan pengiriman
            this.deliveryCost = deliveryCostInt;
            this.deliveryService = deliveryService;

            // Update total dan tampilan biaya pengiriman
            this.updateTotal();
            this.showDeliveryCost();
        },

        // Menghitung dan memperbarui total keseluruhan
        updateTotal() {
            const total = this.subtotal + this.deliveryCost;
            this.total = this.formatRupiah(total);

            // Update elemen DOM untuk total keseluruhan
            document.querySelector("#total").innerText = this.total;
        },

        // Menampilkan biaya pengiriman pada halaman
        showDeliveryCost() {
            // Hapus elemen lama jika ada
            if (document.querySelector("#delivery-cost")) {
                document.querySelector("#delivery-cost").remove();
            }

            // Buat elemen baru untuk biaya pengiriman
            let deliveryCostElement = document.createElement("p");
            deliveryCostElement.id = "delivery-cost";
            deliveryCostElement.className = "flex justify-between mb-2";
            deliveryCostElement.innerHTML = `<span>Delivery</span><span>${this.formatRupiah(
                this.deliveryCost
            )}</span>`;

            // Tambahkan elemen ke DOM
            document
                .querySelector(".checkout-detail")
                .appendChild(deliveryCostElement);
        },

        // Format angka menjadi format rupiah
        formatRupiah(value) {
            return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
            }).format(value);
        },

        // Pemrosesan pembayaran
        async processPayment() {
            this.isProcessing = true;
            // let self = this;
            let token = "";
            console.log(this.total);
            request(
                "get",
                `/checkout/token?deliveryCost=${this.deliveryCost}&deliveryService=${this.deliveryService}&cartTotal=${total}`,
                {
                    params: {
                        deliveryCost: this.deliveryCost,
                        deliveryService: this.deliveryService,
                        cartTotal: this.total,
                    },
                }
            ).then((data) => {
                token = data.token;

                window.snap.pay(token, {
                    onSuccess: this.handlePaymentSuccess.bind(this),
                    onPending: this.handlePaymentPending.bind(this),
                    onError: this.handlePaymentError.bind(this),
                    onClose: this.handlePaymentClose.bind(this)
                });
            });
        },
        // Callback saat pembayaran berhasil
        handlePaymentSuccess(result) {
            this.submitPaymentResult(result);
            this.isProcessing = false;
        },

        // Callback saat pembayaran pending
        handlePaymentPending(result) {
            this.submitPaymentResult(result);
            this.isProcessing = false;
        },

        // Callback saat pembayaran gagal
        handlePaymentError(result) {
            this.submitPaymentResult(result);
            this.isProcessing = false;
        },

        // Callback saat pembayaran ditutup
        handlePaymentClose() {
            this.isProcessing = false;
        },

        // Mengirimkan hasil pembayaran ke form
        submitPaymentResult(result) {
            document.querySelector('input[name="result-data"]').value =
                JSON.stringify(result, null, 2);
            document.querySelector('input[name="delivery-cost"]').value =
                this.deliveryCost;
            document.querySelector('input[name="delivery-service"]').value =
                this.deliveryService;
            document.querySelector("#finish-form").submit();
        },
    }));
});

Alpine.start();
