// Consolidation of authentication logic
import bcrypt from 'bcrypt'
import LocalStrategy from 'passport-local'

export default class Auth {
  #passport
  #db
  constructor (passport, db) {
    this.#passport = passport
    this.#db = db
  }

  init () {
    // Authentication check
    this.#passport.use(
      new LocalStrategy(
        { usernameField: 'name', passwordField: 'password' },
        // Check the validity of credentials
        async (username, password, callback) => {
          const query = `
          SELECT * 
          FROM account
          WHERE account_name = $1
        `
          const results = await this.#db.query(query, [username])
          // No user found
          if (results.rows.length === 0) {
            return callback(null, false)
          // Multiple possible users found - This should not happen
          } else if (results.rows.length > 1) {
            throw new Error('Duplicate account names found')
          // Found matching a user so check password
          } else {
            const user = results.rows[0]
            const passwordHash = user.account_password_hash
            const match = await bcrypt.compare(password, passwordHash)
            if (match) return callback(null, user)
            else return callback(null, false)
          }
        }
      )
    )
    // Session serialization
    this.#passport.serializeUser((user, callback) => {
      callback(null, user.account_id)
    })
    this.#passport.deserializeUser(async (id, callback) => {
      const query = `
        SELECT * 
        FROM account
        WHERE account_id = $1
      `
      const results = await this.#db.query(query, [id])
      return callback(null, results.rows[0])
    })
    return this
  }

  // User registration
  async registerUser (name, password) {
    const hashedPassword = await bcrypt.hash(password, 10)
    const query = `
      INSERT INTO account(account_name, account_password_hash) 
      VALUES ($1, $2) 
      RETURNING *
    `
    const result = await this.#db.query(query, [name, hashedPassword])
    return result
  }

  // Middleware
  authenticate (config) {
    return this.#passport.authenticate('local', config)
  }

  check (redirectPath) {
    return (req, res, next) => {
      if (req.isAuthenticated()) return next()
      else {
        // Store the target URL for after login completes
        // Will be cleared after use
        req.session.targetUrl = req.originalUrl
        res.redirect(redirectPath)
      }
    }
  }

  checkNot (redirectPath) {
    return (req, res, next) => {
      if (req.isAuthenticated()) {
        // Store the target URL for after login completes
        // Will be cleared after use
        req.session.targetUrl = req.originalUrl
        return res.redirect(redirectPath)
      } else next()
    }
  }
}
