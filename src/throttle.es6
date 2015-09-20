import isDescriptor from './isDescriptor';

const PRIVATE_TIMERS_PROP_NAME = Symbol('Throttle_Timers');

/**
 * Крутой зверь, шустрый.
 * с момента первого вызова в течении timeout все вызовы будут игнорироваться.
 * Кроме первого или последнего, в зависимости от invokeAsap
 *
 * > Throttled with `invokeAsap` == false:
 * > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
 * >      X    X    X    X    X             X    X    X    X    X
 * >
 * > Throttled with `invokeAsap` == true:
 * > ||||||||||||||||||||||||| (pause) |||||||||||||||||||||||||
 * > X    X    X    X    X             X    X    X    X    X
 *
 * @param {Number} timeout Uint32
 * @param {Boolean} [invokeAsap] Указывает когда будет вызвана исходная функция. true - в момент первого вызова, или false - по истичению таймаута
 * @param {Object} [context] контекст в котором будет вызываться fn
 */
export default function throttleWrapper( timeout = 100, invokeAsap = false, context ) {
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

    return function throttle( target, key, descriptor ) {

        const initializer = descriptor.initializer;
        const fn = descriptor.value ||
              ( descriptor.initializer && function() {
//                  Arrow function initilizer of class prop hack
                  initializer.call( this )( arguments );
              } );

        if(!fn || !fn instanceof Function)
            throw new SyntaxError( 'Only functions can be debounced' );


        /**
         * Непосредственно объявление и возврат троттлнутой функции, (кто-нибудь, верните мне мой язык)
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

            // Immediate invoke
            invokeAsap && !store.timer && fn.apply( store.context, store.args );

            // Че вызываешь!!1 Занято!
            if( store.timer )
                return;

            // Поставим на счетчик
            store.timer = setTimeout( timedOut, timeout );

            function timedOut() {
                // Ну уж если в строке 127 не вызвали, то тут то должны. Почти должны
                !invokeAsap && fn.apply( store.context, store.args);
                // таймеров больше нет, ждать и вызывать пока нечего, отдыхай
                store.timer = undefined;
            }
        }

        descriptor.value && (descriptor.value = value);
        descriptor.initializer && (descriptor.initializer = function() {
            return value;
        } );
    }
}
