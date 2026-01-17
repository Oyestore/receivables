/**
 * @openapi
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address.
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password.
 *           example: StrongPassword123!
 *     LoginResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT access token.
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token.
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - first_name
 *         - last_name
 *         - tenant_id
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         tenant_id:
 *           type: string
 *           format: uuid
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             code:
 *               type: string
 *             statusCode:
 *               type: integer
 *             timestamp:
 *               type: string
 *               format: date-time
 *             details:
 *               type: object
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
 */
