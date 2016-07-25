// # Rezervace
var sequelize = require(__dirname + '/../models/index').sequelize;

// [Helper pro načtení souboru](../helpers/GetFile.html)
var GetFile = require(__dirname + '/../helpers/GetFile'),
    // [Helper pro generování PDF](../helpers/PdfGekper.html)
    PdfHelper = require(__dirname + '/../helpers/PdfHelper'),
    pdf_helper = new PdfHelper();
// [Helper pro e-maily](../helpers/MailHelper.html)
var MailHelper = require(__dirname + '/../helpers/MailHelper'),
    mail_helper = new MailHelper();

// [Model rezervace](../models/reservation.html)
var Reservation = require(__dirname + '/../models').Reservation,
    // [Model hodnocení](../models/rating.html)
    Rating = require(__dirname + '/../models').Rating,
    // [API pro uživatele](./user.html)
    User = require(__dirname + '/user'),
    // [API pro příslušenství](./accessory.html)
    Accessory = require(__dirname + '/accessory');

// ## Funkce na zpracování e-mailu
function processMail(user, type, reservation, pdfFile) {
    // Načtení konfiguračního souboru.
    var configCustom = JSON.parse(GetFile('./config/app.json')).custom;

    // Pokud nastaveno odesílání e-malů, poslat.
    if (configCustom.SEND_EMAILS) {
        // Zavolat funkci na posílání e-mailu.
        return mail_helper.send(user, type, reservation, pdfFile).then(function(mailResponse) {
            return { success: true };
        });
    // Jinak vrátit úspěch.
    } else {
        return { success: true };
    }
}

// ## Funkce na zpracování PDF e-mailu
function processPdfMail(req, user, type, reservation) {
    // Získání PDF
    return pdf_helper.getFile(req, user).then(function(pdfFile) {
        // Zavolání zpracování e-mailu
        return processMail(user, type, reservation, pdfFile.file);
    });
}

module.exports = {
    // ## Vytvoření rezervace
    create(req, data, accessoriesArr) {
        // Vytvoříme transakci, kdyby se vyskytla chyba, nebudou provedeny žádné změny.
        return sequelize.transaction(function(t) {
            // Dotaz do databáze pro vytvoření rezervace.
            return Reservation.create(data, { transaction: t }).then(function(reservation) {
                var plain = reservation.get({ plain: true });
                plain.accessories = [];

                // Pokud žádné příslušenství, zavolat rovnou funkci na zpracování e-mailu.
                if (accessoriesArr.length === 0) {
                    var dates = {
                        from: plain.from,
                        to: plain.to
                    };
                    return mail_helper.send(req.user, 'draft', plain).then(function(mailResponse) {
                        plain.mailSent = true;
                        return plain;
                    });
                }

                // Nastavení pro dotaz na příslušenství rezervace.
                var accessoryWhere = {
                    id: {
                        $any: accessoriesArr
                    }
                };

                // Dotaz na příslušenství rezervace.
                return Accessory.getObj(accessoryWhere).then(function(accessoriesData) {
                    // Přidání jednotlivých příslušenství do pole.
                    for (var i = 0; i < accessoriesData.accessories.length; i++) {
                        plain.accessories.push(accessoriesData.accessories[i].get({ plain: true }));
                    }

                    // Dotaz do dataváze pro vytvoření asociace příslušenství a rezervace.
                    return reservation.addAccessory(accessoriesData.accessories, { transaction: t }).then(function(response) {

                        // Zavolání funkce na zpracování e-mailu.
                        var dates = {
                            from: plain.from,
                            to: plain.to
                        };
                        return mail_helper.send(req.user, 'draft', plain).then(function(mailResponse) {
                            plain.mailSent = true;
                            return plain;
                        });
                    });
                });
            });
        });
    },

    // ## Získání rezervací
    get(options, fetchUsers) {
        var result = {
                reservations: [],
                users: {},
                total: 0
            },
            reservationsArr = [];

        // Dotaz na všechny rezervace a jejich počet.
        return Reservation.findAndCountAll(options).then(function(data) {
            // Přidání celkového počtu rezervací do objektu s odpovědí.
            result.total = data.count;

            // Dotaz na hodnocení rezervace.
            return data.rows.reduce(function(sequence, reservation) {
                return sequence.then(function() {
                    return reservation.getRating();
                }).then(function(rating) {
                    // Dotaz na příslušenství rezervace.
                    return reservation.getAccessories().then(function(accessoriesData) {
                        // Přidání jednotlivých příslušenství do pole.
                        var accessories = [];
                        for (var i = 0; i < accessoriesData.length; i++) {
                            accessories.push(accessoriesData[i].get({ plain: true }));
                        }


                        var plain = reservation.get({ plain: true });
                        
                        // Přidání jednotlivých hodnocení a příslušenství k rezervaci.
                        plain.rating = rating ? rating.get({ plain: true }) : rating;
                        plain.accessories = accessories;

                        // Přidání rezervace do objektu s odpovědí.
                        result.reservations.push(plain);
                    });
                });
            }, Promise.resolve());
        }).then(function() {
            // Pokud nepotřebujeme získat data o uživateli, odeslat výsledek nyní.
            if (!fetchUsers) {
                return result;
            }

            // Připravení pole s ID uživatelů.
            var usersArr = [];
            for (var i = 0; i < result.reservations.length; i++) {
                if (result.reservations[i].userId in result.users) {
                    continue;
                }
                result.users[result.reservations[i].userId] = {};
                usersArr.push(result.reservations[i].userId);
            }

            // Dotaz na uživatele podle ID,
            return usersArr.reduce(function(sequence, userId) {
                return sequence.then(function() {
                    return User.getById(userId);
                }).then(function(user) {
                    // Přidání uživatele do objektu s odpovědí.
                    result.users[user.id] = user;
                });
            }, Promise.resolve());
        }).then(function() {
            return result;
        });
    },

    // ## Získání rezervace podle ID
    getById(id) {
        // Dotaz na rezervaci podle ID.
        return Reservation.findById(id).then(function(reservation) {
            // Dotaz na hodnocení rezervace.
            return reservation.getRating().then(function(rating) {
                // Dotaz na příslušenství rezervace.
                return reservation.getAccessories().then(function(data) {
                    reservation = reservation.get({ plain: true });
                    reservation.rating = rating ? rating.get({ plain: true }) : rating;

                    // Přidání jednotlivých příslušenství do pole.
                    reservation.accessories = [];
                    for (var i = 0; i < data.length; i++) {
                        reservation.accessories.push(data[i].get({ plain: true }));
                    }

                    return reservation;
                });
            });
        });
    },

    // ## Spočítání rezervací
    count(options) {
        return Reservation.count(options);
    },

    // ## Aktualizace rezervace
    update(id, data, req) {
        // Vytvoříme transakci, kdyby se vyskytla chyba, nebudou provedeny žádné změny.
        return sequelize.transaction(function(t) {
            // Dotaz na aktualizaci dat rezervace,
            return Reservation.update(data, {
                where: {
                    id: id
                }
            }, { transaction: t }).then(function(count) {
                // Pokud se jedná o draft, nebo se nemění stav, skončít teď.
                if (!('state' in data) || ['confirmed', 'canceled', 'canceled_admin', 'rejected'].indexOf(data.state) < 0) {
                    return count;
                }

                // Dotaz na rezervaci podle ID.
                return Reservation.findById(id, { transaction: t }).then(function(reservation) {
                    reservation = reservation.get({ plain: true });

                    // Dotaz na uživatele rezervace,
                    return User.getById(reservation.userId, { transaction: t }).then(function(user) {
                        user = user.get({ plain: true });
                        var dates = {
                            from: reservation.from,
                            to: reservation.to
                        };

                        // Pokud se jedná o zrušení rezervace jakýmkoliv způsobem, zavolat
                        // funkci na zpracování e-mailu.
                        if (['canceled', 'canceled_admin', 'rejected'].indexOf(data.state) > -1) {
                            var type = data.state === 'canceled' ? 'canceled_user' : 'canceled_admin';
                            return mail_helper.send(user, type, reservation).then(function(result) {
                                return result;
                            });
                        // Jinak zavolat funkci na zpracování PDF e-mailu.
                        } else {
                            return processPdfMail(req, user, 'confirmed', dates).then(function(result) {
                                return result;
                            });
                        }
                    });
                });
            });
        });
    },

    // ## Hodnocení rezervace
    rate(id, data) {
        // Dotaz na rezervaci podle ID.
        return Reservation.findById(id).then(function(reservation) {
            data.userId = reservation.userId;
            data.reservationId = reservation.id;

            // Vytvořt nebo aktualizovat hodnocení rezervace.
            return Rating.upsert(data).then(function(created) {
                if (created) {
                    return data;
                }
                return created;
            });
        });
    }
};
