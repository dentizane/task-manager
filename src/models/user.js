const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        name: {
            type: DataTypes.STRING,
            required: true
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            required: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            required: true,
            set(value) {this.setDataValue('password',value.trim())},
            validate: {
                len: [6,100],
                notContains: 'password'
            }
        },
        age: {
            type: DataTypes.INTEGER,
            required: false,
            validate: {
               min: 0
            }
        },
        tokens: {
            type: DataTypes.TEXT,
            required: true,
            defaultValue: '[]',
            get() {
                return JSON.parse(this.getDataValue('tokens'))
            },
            set(val) {
                this.setDataValue('tokens', JSON.stringify(val))
            }
        },
        avatar: {
            type: DataTypes.BLOB('medium')
        }
    },
    {
        hooks: {
          beforeSave: async function(user, options) {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 8)
            }
          },
          beforeUpdate: async function(user, options) {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 8)
            }
          }
        }
    })

    // override toJSON
    User.prototype.toJSON = function() {
        const obj = Object.assign({}, this.get())
        delete obj.password
        delete obj.tokens
        delete obj.avatar
        return obj
    }

    User.prototype.generateAuthToken = async function() {
        const token = jwt.sign({ id: this.id.toString() }, process.env.JWT_SECRET)

        this.tokens = this.tokens.concat(token)
        await this.save()

        return token
    }

    User.findByCredentials = async function(email, password) {
        const user = await User.findOne({ where: {email} })
        if (!user) {
            throw new Error('Invalid email/password')
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            throw new Error('Invalid email/password')
        }

        return user
    }

    return User
}
  