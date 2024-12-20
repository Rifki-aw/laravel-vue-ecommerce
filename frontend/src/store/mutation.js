export function setUser(state, user) {
    // console.log("Mutation setUser called with:", user);
    state.user.data = user;
    if (user) {
        sessionStorage.setItem("USER_DATA", JSON.stringify(user));
    } else {
        sessionStorage.removeItem("USER_DATA");
    }
}

export function setToken(state, token) {
    state.user.token = token;
    if (token) {
        sessionStorage.setItem("TOKEN", token);
    } else {
        sessionStorage.removeItem("TOKEN");
        sessionStorage.removeItem("USER_DATA");
    }
}

export function showToast(state, message) {
    state.toast.show = true;
    state.toast.message = message;
}

export function hideToast(state) {
    state.toast.show = false;
    state.toast.message = "";
}

export function setProducts(state, [loading, data = null]) {
    if (data) {
        state.products = {
            ...state.products,
            data: data.data, // Data produk
            links: data.meta?.links, // Pagination links
            page: data.meta.current_page, // Halaman saat ini
            limit: data.meta.per_page, // Data per halaman
            from: data.meta.from, // Data mulai
            to: data.meta.to, // Data selesai
            total: data.meta.total, // Total data
        };
    }
    state.products.loading = loading; // Atur status loading
}
