import isDescriptor from './isDescriptor';

const PRIVATE_TIMERS_PROP_NAME = Symbol('Debounce_Timers');

/**
 * @module {Function} Звезда в представлении не нуждается
 *
 * С каждой попыткой вызова дебаунснутой функции, итоговый таймаут отодвигается на timeout
 *
 * > Debounced with `invokeAsap` == false:
 * > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
 * >                          X                                 X
 * >
 * > Debounced with `invokeAsap` == true:
 * > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
 * > X                                 X
 *
 * @param {Number} timeout Uint32
 * @param {Boolean} [invokeAsap] Указывает когда будет вызвана исходная функция. true - в момент первого вызова, или false - по истичению таймаута
 * @param {Object} [context] контекст в котором будет вызываться fn
 */
export default function debounceWrapper( timeout = 100, invokeAsap = false, context ) {
    if( isDescriptor( context ) ) {
        throw new TypeError( 'Incorrect usege. Example: @debounce( [...args] )' );
    }

    if( typeof timeout !== 'number' ) {
        throw new TypeError( `Type of timeout must me number, not ${typeof invokeAsap}` );
    }

    // invokeAsap мы не троаем видите ли, зато контекс по полной
    if( typeof invokeAsap !== 'boolean' ) {
        if( context !== undefined ) {
            context = invokeAsap;
            invokeAsap = false;
        } else {
            throw new TypeError( `Type of invokeAsap must me boolean, not ${typeof invokeAsap}` );
        }
    }

    timeout = timeout >>> 0;

    return function debounce( target, key, descriptor ) {

        const initializer = descriptor.initializer;
        const fn = descriptor.value ||
              ( descriptor.initializer && function() {
//                  Arrow function initilizer of class prop hack
                  initializer.call( this )( arguments );
              } );

        if(!fn || !fn instanceof Function)
            throw new SyntaxError( 'Only functions can be debounced' );

        /**
         * Непосредственно объявление и возврат дебаунснутой функции,
         * которая и будет вершить правосудие
         */
        let value = function() {

            // Detect context for setting private property with timers
            let _context = context || this;

            if( !_context[ PRIVATE_TIMERS_PROP_NAME ] ) {
                Object.defineProperty(
                    _context,
                    PRIVATE_TIMERS_PROP_NAME,
                    {
                        enumerable: false,
                        writable: true,
                        configurable: false,
                        value: {}
                    }
                )
            }

            // Create object for timers for specified class method
            if( !_context[ PRIVATE_TIMERS_PROP_NAME ][ key ] ) {
                _context[ PRIVATE_TIMERS_PROP_NAME ][ key ] = {}
            }
            let store = _context[ PRIVATE_TIMERS_PROP_NAME ][ key ];

            // Запомним контекст и аргументы текущего вызова.
            // Если оригинальную функцию нужно вызвать сейчас - ничего страшного
            // А вообще, пригодится при invokeAsap == false
            store.args = arguments;
            store.context = context || this;

            // Когда был последний вызов? Да только что
            store.lastCall = Date.now();

            // Immediate invoke
            invokeAsap && !store.timer && fn.apply( store.context, store.args );

            // Ты у нас первый раз? Поставим на счетчик
            if( !store.timer ) {
                store.timer = setTimeout(timedOut, timeout);
            }

            function timedOut() {
                let tStamp = Date.now();
                // Если с момента ожидания таймаутов не было вызовов
                // Надо же, такая ситуация встречается =D
                if( tStamp - store.lastCall >= timeout ) {
                    // All timers expired. Invoke
                    !invokeAsap && fn.apply( store.context, store.args );
                    // таймеров больше нет, ждать и вызывать пока нечего, отдыхай
                    store.timer = undefined;
                } else {
                    // Еще успело прилететь вызовов?
                    // Ок, подождем...
                    store.timer = setTimeout(
                        timedOut,
                        // Ну дык если второй вызов произошел спустя timeout/2,
                        // то еще ждать целый timeout смысла не имеет
                        store.lastCall - tStamp + timeout
                    );
                }
            }
        }

        descriptor.value && (descriptor.value = value);
        descriptor.initializer && (descriptor.initializer = function() {
            return value;
        } );
    }
}
