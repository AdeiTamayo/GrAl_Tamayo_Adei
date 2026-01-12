export default function Login() {
    return (


        // Login form and authentication logic will be implemented here

        <form>
            <label htmlFor="username">Username:
                <input type="text" id="username" name="username" required />
            </label>
            <label htmlFor="password">Password:
                <input type="password" id="password" name="password" required />
            </label>
            <button type="submit">Login</button>
        </form>



    );
}
